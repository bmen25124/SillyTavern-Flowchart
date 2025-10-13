import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { StringToolsNode } from './StringToolsNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const StringToolsNodeDataSchema = z.object({
  operation: z.enum(['merge', 'split', 'join']).optional(),
  delimiter: z.string().optional(),
  inputCount: z.number().min(1).optional(),
  _version: z.number().optional(),
});
export type StringToolsNodeData = z.infer<typeof StringToolsNodeDataSchema>;

const STRING_TOOLS_MERGE_HANDLE_PREFIX = 'string_';

const execute: NodeExecutor = async (node, input) => {
  const data = StringToolsNodeDataSchema.parse(node.data);
  const operation = resolveInput(input, data, 'operation') ?? 'merge';
  const delimiter = resolveInput(input, data, 'delimiter') ?? '';
  const definition = registrator.nodeDefinitionMap.get('stringToolsNode')!;

  switch (operation) {
    case 'merge':
      const strings = Object.keys(input)
        .filter((key) => definition.isDynamicHandle!(key))
        .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10))
        .map((key) => String(input[key]));
      return { result: strings.join(delimiter) };
    case 'split':
      const strToSplit = input.string;
      if (typeof strToSplit !== 'string') throw new Error('Input for split must be a string.');
      return { result: strToSplit.split(delimiter) };
    case 'join':
      const arrToJoin = input.array;
      if (!Array.isArray(arrToJoin)) throw new Error('Input for join must be an array.');
      return { result: arrToJoin.join(delimiter) };
    default:
      throw new Error(`Unknown string operation: ${operation}`);
  }
};

export const stringToolsNodeDefinition: NodeDefinition<StringToolsNodeData> = {
  type: 'stringToolsNode',
  label: 'String Tools',
  category: 'Utility',
  component: StringToolsNode,
  dataSchema: StringToolsNodeDataSchema,
  currentVersion: 1,
  initialData: { operation: 'merge', inputCount: 2, delimiter: '' },
  handles: {
    inputs: [
      { id: 'operation', type: FlowDataType.STRING },
      { id: 'delimiter', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'result', type: FlowDataType.ANY }],
  },
  execute,
  getDynamicHandleId: (index: number) => `${STRING_TOOLS_MERGE_HANDLE_PREFIX}${index}`,
  isDynamicHandle: (handleId: string | null) => handleId?.startsWith(STRING_TOOLS_MERGE_HANDLE_PREFIX) ?? false,
  getDynamicHandles: (node) => {
    const { data } = node;
    const inputs = [];
    if (data.operation === 'merge') {
      for (let i = 0; i < (data.inputCount ?? 2); i++) {
        inputs.push({ id: `${STRING_TOOLS_MERGE_HANDLE_PREFIX}${i}`, type: FlowDataType.STRING });
      }
    } else if (data.operation === 'split') {
      inputs.push({ id: 'string', type: FlowDataType.STRING });
    } else if (data.operation === 'join') {
      inputs.push({ id: 'array', type: FlowDataType.OBJECT });
    }
    return { inputs, outputs: [] };
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'input') {
      const data = node.data as StringToolsNodeData;
      if (data.operation === 'merge' && handleId?.startsWith(STRING_TOOLS_MERGE_HANDLE_PREFIX))
        return FlowDataType.STRING;
      if (data.operation === 'split' && handleId === 'string') return FlowDataType.STRING;
      if (data.operation === 'join' && handleId === 'array') return FlowDataType.OBJECT;
    }
    if (handleDirection === 'output' && handleId === 'result') {
      const data = node.data as StringToolsNodeData;
      if (data.operation === 'split') return FlowDataType.OBJECT;
      return FlowDataType.STRING;
    }
    return undefined;
  },
};

registrator.register(stringToolsNodeDefinition);

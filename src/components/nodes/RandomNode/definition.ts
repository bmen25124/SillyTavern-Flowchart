import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, RandomNodeDataSchema } from '../../../flow-types.js';
import { RandomNode } from './RandomNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

const execute: NodeExecutor = async (node, input) => {
  const data = RandomNodeDataSchema.parse(node.data);
  const mode = resolveInput(input, data, 'mode') ?? 'number';

  if (mode === 'number') {
    const min = resolveInput(input, data, 'min') ?? 0;
    const max = resolveInput(input, data, 'max') ?? 100;
    return { result: Math.random() * (max - min) + min };
  }
  if (mode === 'array') {
    const arr = input.array;
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('Input is not a non-empty array.');
    const randomIndex = Math.floor(Math.random() * arr.length);
    return { result: arr[randomIndex] };
  }
  throw new Error(`Unknown random mode: ${mode}`);
};

export const randomNodeDefinition: NodeDefinition = {
  type: 'randomNode',
  label: 'Random',
  category: 'Utility',
  component: RandomNode,
  dataSchema: RandomNodeDataSchema,
  currentVersion: 1,
  initialData: { mode: 'number', min: 0, max: 100, _version: 1 },
  handles: {
    inputs: [
      { id: 'mode', type: FlowDataType.STRING },
      { id: 'min', type: FlowDataType.NUMBER },
      { id: 'max', type: FlowDataType.NUMBER },
      { id: 'array', type: FlowDataType.OBJECT },
    ],
    outputs: [{ id: 'result', type: FlowDataType.ANY }],
  },
  execute,
};

registrator.register(randomNodeDefinition);

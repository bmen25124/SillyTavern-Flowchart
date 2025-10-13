import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { MergeObjectsNode } from './MergeObjectsNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

export const MergeObjectsNodeDataSchema = z.object({
  inputCount: z.number().min(1).default(2),
  _version: z.number().optional(),
});
export type MergeObjectsNodeData = z.infer<typeof MergeObjectsNodeDataSchema>;

const MERGE_OBJECTS_HANDLE_PREFIX = 'object_';

const execute: NodeExecutor = async (node, input) => {
  const definition = registrator.nodeDefinitionMap.get('mergeObjectsNode')!;
  const objectsToMerge = Object.keys(input)
    .filter((key) => definition.isDynamicHandle!(key) && typeof input[key] === 'object' && input[key] !== null)
    .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10))
    .map((key) => input[key]);

  return Object.assign({}, ...objectsToMerge);
};

export const mergeObjectsNodeDefinition: NodeDefinition<MergeObjectsNodeData> = {
  type: 'mergeObjectsNode',
  label: 'Merge Objects',
  category: 'Utility',
  component: MergeObjectsNode,
  dataSchema: MergeObjectsNodeDataSchema,
  currentVersion: 1,
  initialData: { inputCount: 2 },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.OBJECT }] },
  execute,
  getDynamicHandleId: (index: number) => `${MERGE_OBJECTS_HANDLE_PREFIX}${index}`,
  isDynamicHandle: (handleId: string | null) => handleId?.startsWith(MERGE_OBJECTS_HANDLE_PREFIX) ?? false,
  getDynamicHandles: (node) => {
    const inputs = [];
    for (let i = 0; i < node.data.inputCount; i++) {
      inputs.push({ id: `${MERGE_OBJECTS_HANDLE_PREFIX}${i}`, type: FlowDataType.OBJECT });
    }
    return { inputs, outputs: [] };
  },
  getHandleType: ({ handleId, handleDirection }) => {
    if (handleDirection === 'input' && handleId?.startsWith(MERGE_OBJECTS_HANDLE_PREFIX)) return FlowDataType.OBJECT;
    return undefined;
  },
};

registrator.register(mergeObjectsNodeDefinition);

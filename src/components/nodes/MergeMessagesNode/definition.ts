import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { MergeMessagesNode } from './MergeMessagesNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

export const MergeMessagesNodeDataSchema = z.object({
  inputCount: z.number().min(1).default(2),
  _version: z.number().optional(),
});
export type MergeMessagesNodeData = z.infer<typeof MergeMessagesNodeDataSchema>;

const MERGE_MESSAGES_HANDLE_PREFIX = 'messages_';

const execute: NodeExecutor = async (node, input) => {
  const definition = registrator.nodeDefinitionMap.get('mergeMessagesNode')!;
  const merged = Object.keys(input)
    .filter((key) => definition.isDynamicHandle!(key) && Array.isArray(input[key]))
    .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10))
    .flatMap((key) => input[key]);
  return { result: merged };
};

export const mergeMessagesNodeDefinition: NodeDefinition<MergeMessagesNodeData> = {
  type: 'mergeMessagesNode',
  label: 'Merge Messages',
  category: 'API Request',
  component: MergeMessagesNode,
  dataSchema: MergeMessagesNodeDataSchema,
  currentVersion: 1,
  initialData: { inputCount: 2 },
  handles: { inputs: [], outputs: [{ id: 'result', type: FlowDataType.MESSAGES }] },
  execute,
  getDynamicHandleId: (index: number) => `${MERGE_MESSAGES_HANDLE_PREFIX}${index}`,
  isDynamicHandle: (handleId: string | null) => handleId?.startsWith(MERGE_MESSAGES_HANDLE_PREFIX) ?? false,
  getDynamicHandles: (node) => {
    const inputs = [];
    for (let i = 0; i < node.data.inputCount; i++) {
      inputs.push({ id: `${MERGE_MESSAGES_HANDLE_PREFIX}${i}`, type: FlowDataType.MESSAGES });
    }
    return { inputs, outputs: [] };
  },
  getHandleType: ({ handleId, handleDirection }) => {
    if (handleDirection === 'input' && handleId?.startsWith(MERGE_MESSAGES_HANDLE_PREFIX)) return FlowDataType.MESSAGES;
    return undefined;
  },
};

registrator.register(mergeMessagesNodeDefinition);

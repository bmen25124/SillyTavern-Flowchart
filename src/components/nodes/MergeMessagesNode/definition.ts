import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, MergeMessagesNodeDataSchema } from '../../../flow-types.js';
import { MergeMessagesNode } from './MergeMessagesNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const MERGE_MESSAGES_HANDLE_PREFIX = 'messages_';

const execute: NodeExecutor = async (node, input) => {
  const definition = registrator.nodeDefinitionMap.get('mergeMessagesNode')!;
  return Object.keys(input)
    .filter((key) => definition.isDynamicHandle!(key) && Array.isArray(input[key]))
    .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10))
    .flatMap((key) => input[key]);
};

export const mergeMessagesNodeDefinition: NodeDefinition = {
  type: 'mergeMessagesNode',
  label: 'Merge Messages',
  category: 'API Request',
  component: MergeMessagesNode,
  dataSchema: MergeMessagesNodeDataSchema,
  currentVersion: 1,
  initialData: { inputCount: 2, _version: 1 },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.MESSAGES }] },
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

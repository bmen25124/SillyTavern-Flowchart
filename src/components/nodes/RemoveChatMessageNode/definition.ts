import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, RemoveChatMessageNodeDataSchema } from '../../../flow-types.js';
import { RemoveChatMessageNode } from './RemoveChatMessageNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = RemoveChatMessageNodeDataSchema.parse(node.data);
  const messageId = resolveInput(input, data, 'messageId');
  if (messageId === undefined) throw new Error('Message ID is required.');

  await dependencies.deleteMessage(messageId);
  return {};
};

export const removeChatMessageNodeDefinition: NodeDefinition = {
  type: 'removeChatMessageNode',
  label: 'Remove Chat Message',
  category: 'Chat',
  component: RemoveChatMessageNode,
  dataSchema: RemoveChatMessageNodeDataSchema,
  currentVersion: 1,
  initialData: { _version: 1 },
  handles: {
    inputs: [{ id: 'messageId', type: FlowDataType.NUMBER }],
    outputs: [],
  },
  execute,
};

registrator.register(removeChatMessageNodeDefinition);

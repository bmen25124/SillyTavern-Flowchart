import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { RemoveChatMessageNode } from './RemoveChatMessageNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const RemoveChatMessageNodeDataSchema = z.object({
  messageId: z.number().optional(),
  _version: z.number().optional(),
});
export type RemoveChatMessageNodeData = z.infer<typeof RemoveChatMessageNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = RemoveChatMessageNodeDataSchema.parse(node.data);
  const messageId = resolveInput(input, data, 'messageId');
  if (messageId === undefined) throw new Error('Message ID is required.');

  await dependencies.deleteMessage(messageId);
  return { messageId }; // Passthrough the ID
};

export const removeChatMessageNodeDefinition: NodeDefinition<RemoveChatMessageNodeData> = {
  type: 'removeChatMessageNode',
  label: 'Remove Chat Message',
  category: 'Chat',
  component: RemoveChatMessageNode,
  dataSchema: RemoveChatMessageNodeDataSchema,
  currentVersion: 1,
  initialData: {},
  handles: {
    inputs: [{ id: 'messageId', type: FlowDataType.NUMBER }],
    outputs: [{ id: 'messageId', type: FlowDataType.NUMBER }],
  },
  execute,
  isPassthrough: true,
  passthroughHandleId: 'messageId',
};

registrator.register(removeChatMessageNodeDefinition);

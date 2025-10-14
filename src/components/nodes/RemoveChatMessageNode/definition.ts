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
  const messageId = input.main ?? resolveInput(input, data, 'messageId');
  if (messageId === undefined) throw new Error('Message ID is required.');

  await dependencies.deleteMessage(messageId);
  // Returns void, passthrough is handled by runner.
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
    inputs: [{ id: 'main', type: FlowDataType.NUMBER }],
    outputs: [{ id: 'main', type: FlowDataType.NUMBER }],
  },
  execute,
};

registrator.register(removeChatMessageNodeDefinition);

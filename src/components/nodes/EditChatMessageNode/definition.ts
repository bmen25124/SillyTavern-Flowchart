import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { EditChatMessageNode } from './EditChatMessageNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { ChatMessageSchema } from '../../../schemas.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const EditChatMessageNodeDataSchema = z.object({
  messageId: z.number().optional(), // Optional is correct here as it's a required input connection
  message: z.string().default(''),
  _version: z.number().optional(),
});
export type EditChatMessageNodeData = z.infer<typeof EditChatMessageNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = EditChatMessageNodeDataSchema.parse(node.data);
  const messageId = resolveInput(input, data, 'messageId');
  const newMessage = resolveInput(input, data, 'message');
  if (messageId === undefined) throw new Error('Message ID is required.');
  if (newMessage === undefined) throw new Error('New message content is required.');

  const { chat } = dependencies.getSillyTavernContext();
  const message = chat[messageId];
  if (!message) throw new Error(`Message with ID ${messageId} not found.`);

  message.mes = newMessage;
  dependencies.st_updateMessageBlock(messageId, message);
  await dependencies.saveChat();
  return { messageObject: structuredClone(message), message: newMessage };
};

export const editChatMessageNodeDefinition: NodeDefinition<EditChatMessageNodeData> = {
  type: 'editChatMessageNode',
  label: 'Edit Chat Message',
  category: 'Chat',
  component: EditChatMessageNode,
  dataSchema: EditChatMessageNodeDataSchema,
  currentVersion: 1,
  initialData: { message: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'messageId', type: FlowDataType.NUMBER },
      { id: 'message', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'messageObject', type: FlowDataType.OBJECT, schema: ChatMessageSchema },
      { id: 'message', type: FlowDataType.STRING },
    ],
  },
  execute,
};

registrator.register(editChatMessageNodeDefinition);

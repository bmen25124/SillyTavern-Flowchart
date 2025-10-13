import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, EditChatMessageNodeDataSchema } from '../../../flow-types.js';
import { EditChatMessageNode } from './EditChatMessageNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { ChatMessageSchema } from '../../../schemas.js';

const resolveInput = <T extends object, K extends keyof T>(input: Record<string, any>, staticData: T, key: K): T[K] =>
  input[key as string] ?? staticData[key];

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
  return { messageObject: structuredClone(message) };
};

export const editChatMessageNodeDefinition: NodeDefinition = {
  type: 'editChatMessageNode',
  label: 'Edit Chat Message',
  category: 'Chat',
  component: EditChatMessageNode,
  dataSchema: EditChatMessageNodeDataSchema,
  currentVersion: 1,
  initialData: { message: '', _version: 1 },
  handles: {
    inputs: [
      { id: 'messageId', type: FlowDataType.NUMBER },
      { id: 'message', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'messageObject', type: FlowDataType.OBJECT, schema: ChatMessageSchema }],
  },
  execute,
};

registrator.register(editChatMessageNodeDefinition);

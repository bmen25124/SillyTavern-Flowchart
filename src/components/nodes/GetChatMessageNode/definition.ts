import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { GetChatMessageNode } from './GetChatMessageNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { ChatMessageSchema } from '../../../schemas.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const GetChatMessageNodeDataSchema = z.object({
  messageId: z.string().default('last'),
  _version: z.number().optional(),
});
export type GetChatMessageNodeData = z.infer<typeof GetChatMessageNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = GetChatMessageNodeDataSchema.parse(node.data);
  const messageIdInput = resolveInput(input, data, 'messageId');
  if (messageIdInput === undefined) throw new Error('Message ID is required.');

  const { chat } = dependencies.getSillyTavernContext();
  let messageIndex: number;

  if (typeof messageIdInput === 'number') {
    messageIndex = chat.findIndex((_, i) => i === messageIdInput);
  } else {
    const idStr = String(messageIdInput).toLowerCase().trim();
    if (idStr === 'last') {
      messageIndex = chat.length - 1;
    } else if (idStr === 'first') {
      messageIndex = 0;
    } else {
      messageIndex = parseInt(idStr, 10);
    }
  }

  if (isNaN(messageIndex) || messageIndex < 0 || messageIndex >= chat.length) {
    throw new Error(`Message with ID/Index "${messageIdInput}" not found or invalid.`);
  }
  const message = structuredClone(chat[messageIndex]);
  return {
    id: messageIndex,
    result: message,
    name: message.name,
    mes: message.mes,
    is_user: !!message.is_user,
    is_system: !!message.is_system,
  };
};

export const getChatMessageNodeDefinition: NodeDefinition<GetChatMessageNodeData> = {
  type: 'getChatMessageNode',
  label: 'Get Chat Message',
  category: 'Chat',
  component: GetChatMessageNode,
  dataSchema: GetChatMessageNodeDataSchema,
  currentVersion: 1,
  initialData: { messageId: 'last' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'messageId', type: FlowDataType.ANY },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'id', type: FlowDataType.NUMBER },
      { id: 'result', type: FlowDataType.OBJECT, schema: ChatMessageSchema },
      { id: 'name', type: FlowDataType.STRING },
      { id: 'mes', type: FlowDataType.STRING },
      { id: 'is_user', type: FlowDataType.BOOLEAN },
      { id: 'is_system', type: FlowDataType.BOOLEAN },
    ],
  },
  execute,
};

registrator.register(getChatMessageNodeDefinition);

import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { ChatMessageSchema } from '../../../schemas.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { GetChatMessagesNode } from './GetChatMessagesNode.js';

export const GetChatMessagesNodeDataSchema = z.object({
  startId: z.string().default('first'),
  endId: z.string().default('last'),
  _version: z.number().optional(),
});
export type GetChatMessagesNodeData = z.infer<typeof GetChatMessagesNodeDataSchema>;

const parseIndex = (id: string, chatLength: number): number => {
  const normalizedId = id.trim().toLowerCase();
  if (normalizedId === 'first') return 0;
  if (normalizedId === 'last') return chatLength - 1;

  const parsed = parseInt(normalizedId, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid message index "${id}". Must be 'first', 'last', or a number.`);
  }
  return parsed;
};

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = GetChatMessagesNodeDataSchema.parse(node.data);
  const startIdStr = String(resolveInput(input, data, 'startId'));
  const endIdStr = String(resolveInput(input, data, 'endId'));

  const { chat } = dependencies.getSillyTavernContext();
  const chatLength = chat.length;

  if (chatLength === 0) {
    return { messages: [], count: 0 };
  }

  const startIndex = parseIndex(startIdStr, chatLength);
  const endIndex = parseIndex(endIdStr, chatLength);

  if (startIndex < 0 || startIndex >= chatLength || endIndex < 0 || endIndex >= chatLength || startIndex > endIndex) {
    throw new Error(`Invalid message range: from ${startIndex} to ${endIndex}. Valid range is 0 to ${chatLength - 1}.`);
  }

  // slice's end index is exclusive, so we add 1
  const messages = structuredClone(chat.slice(startIndex, endIndex + 1));

  return {
    messages,
    count: messages.length,
  };
};

export const getChatMessagesNodeDefinition: NodeDefinition<GetChatMessagesNodeData> = {
  type: 'getChatMessagesNode',
  label: 'Get Chat Messages',
  category: 'Chat',
  component: GetChatMessagesNode,
  dataSchema: GetChatMessagesNodeDataSchema,
  currentVersion: 1,
  initialData: { startId: 'first', endId: 'last' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'startId', type: FlowDataType.ANY }, // ANY to allow number or string
      { id: 'endId', type: FlowDataType.ANY }, // ANY to allow number or string
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'messages', type: FlowDataType.ARRAY, schema: z.array(ChatMessageSchema) },
      { id: 'count', type: FlowDataType.NUMBER },
    ],
  },
  execute,
};

registrator.register(getChatMessagesNodeDefinition);

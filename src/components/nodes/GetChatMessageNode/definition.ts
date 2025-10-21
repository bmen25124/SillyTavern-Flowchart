import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { ChatMessageSchema } from '../../../schemas.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STInput } from 'sillytavern-utils-lib/components';

export const GetChatMessageNodeDataSchema = z.object({
  messageId: z.string().default('last'),
  _version: z.number().optional(),
});
export type GetChatMessageNodeData = z.infer<typeof GetChatMessageNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = GetChatMessageNodeDataSchema.parse(node.data);
  const messageIdInput = String(resolveInput(input, data, 'messageId') ?? '')
    .trim()
    .toLowerCase();

  if (!messageIdInput) throw new Error('Message ID is required.');

  const { chat } = dependencies.getSillyTavernContext();
  let messageIndex: number;

  if (messageIdInput === 'last') {
    messageIndex = chat.length - 1;
  } else if (messageIdInput === 'first') {
    messageIndex = 0;
  } else {
    // Parse as numeric index.
    const parsedIndex = parseInt(messageIdInput, 10);
    if (isNaN(parsedIndex)) {
      throw new Error(`Message ID/Index "${messageIdInput}" must be 'last', 'first', or a valid integer.`);
    }
    messageIndex = parsedIndex;
  }

  if (messageIndex < 0 || messageIndex >= chat.length) {
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
  component: DataDrivenNode,
  dataSchema: GetChatMessageNodeDataSchema,
  currentVersion: 1,
  initialData: { messageId: 'last' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'messageId', type: FlowDataType.STRING },
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
  validate: combineValidators(createRequiredFieldValidator('messageId', 'Message ID is required.')),
  execute,
  meta: {
    fields: [
      createFieldConfig({
        id: 'messageId',
        label: 'Message ID (e.g., last, first, 123)',
        component: STInput,
        props: { placeholder: 'last', type: 'text' },
      }),
    ],
  },
};

registrator.register(getChatMessageNodeDefinition);

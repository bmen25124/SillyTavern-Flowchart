import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { EditChatMessageNode } from './EditChatMessageNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { ChatMessageSchema } from '../../../schemas.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';

export const EditChatMessageNodeDataSchema = z.object({
  messageId: z.number().optional(),
  message: z.string().optional(),
  displayText: z.string().optional(),
  removeDisplayText: z.boolean().optional(),
  _version: z.number().optional(),
});
export type EditChatMessageNodeData = z.infer<typeof EditChatMessageNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = EditChatMessageNodeDataSchema.parse(node.data);
  const messageId = resolveInput(input, data, 'messageId');
  if (messageId === undefined) throw new Error('Message ID is required.');

  const { chat } = dependencies.getSillyTavernContext();
  const message = chat[messageId];
  if (!message) throw new Error(`Message with ID ${messageId} not found.`);

  let hasChanges = false;
  const newMessage = resolveInput(input, data, 'message');
  const newDisplayText = resolveInput(input, data, 'displayText');
  const shouldRemoveDisplayText = resolveInput(input, data, 'removeDisplayText');

  // Rule: Only update `mes` if a non-empty string value is provided.
  if (newMessage && message.mes !== newMessage) {
    message.mes = newMessage;
    hasChanges = true;
  }

  // Rule: Handle display_text with explicit removal flag.
  const isDisplayTextConnected = input.displayText !== undefined;
  if (shouldRemoveDisplayText) {
    if (message.extra && message.extra.display_text !== undefined) {
      delete message.extra.display_text;
      hasChanges = true;
    }
  } else if (isDisplayTextConnected || (newDisplayText && newDisplayText.trim() !== '')) {
    if (!message.extra) message.extra = {};
    if (message.extra.display_text !== newDisplayText) {
      message.extra.display_text = newDisplayText;
      hasChanges = true;
    }
  }

  if (hasChanges) {
    dependencies.st_updateMessageBlock(messageId, message);
    await dependencies.saveChat();
  }

  return { messageObject: structuredClone(message), message: message.mes };
};

export const editChatMessageNodeDefinition: NodeDefinition<EditChatMessageNodeData> = {
  type: 'editChatMessageNode',
  label: 'Edit Chat Message',
  category: 'Chat',
  component: EditChatMessageNode,
  dataSchema: EditChatMessageNodeDataSchema,
  currentVersion: 1,
  initialData: {},
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'messageId', type: FlowDataType.NUMBER },
      { id: 'message', type: FlowDataType.STRING },
      { id: 'displayText', type: FlowDataType.STRING },
      { id: 'removeDisplayText', type: FlowDataType.BOOLEAN },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'messageObject', type: FlowDataType.OBJECT, schema: ChatMessageSchema },
      { id: 'message', type: FlowDataType.STRING },
    ],
  },
  validate: combineValidators(createRequiredFieldValidator('messageId', 'Message ID is required.')),
  execute,
};

registrator.register(editChatMessageNodeDefinition);

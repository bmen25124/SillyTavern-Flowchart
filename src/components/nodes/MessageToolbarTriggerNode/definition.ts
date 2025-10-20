import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { MessageToolbarTriggerNode } from './MessageToolbarTriggerNode.js';
import { ChatMessageSchema } from '../../../schemas.js';

export const MessageToolbarTriggerNodeDataSchema = z.object({
  buttonText: z.string().min(1, 'Button text cannot be empty').default('Run Flow'),
  icon: z.string().default('fa-solid fa-play'),
  _version: z.number().optional(),
});
export type MessageToolbarTriggerNodeData = z.infer<typeof MessageToolbarTriggerNodeDataSchema>;

const execute: NodeExecutor = async (_node, input) => {
  return { ...input };
};

export const messageToolbarTriggerNodeDefinition: NodeDefinition<MessageToolbarTriggerNodeData> = {
  type: 'messageToolbarTriggerNode',
  label: 'Message Toolbar Trigger',
  category: 'Trigger',
  component: MessageToolbarTriggerNode,
  dataSchema: MessageToolbarTriggerNodeDataSchema,
  currentVersion: 1,
  initialData: { buttonText: 'Run Flow', icon: 'fa-solid fa-play' },
  handles: {
    inputs: [],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'messageId', type: FlowDataType.NUMBER },
      { id: 'messageContent', type: FlowDataType.STRING },
      { id: 'messageObject', type: FlowDataType.OBJECT, schema: ChatMessageSchema },
    ],
  },
  execute,
};

registrator.register(messageToolbarTriggerNodeDefinition);

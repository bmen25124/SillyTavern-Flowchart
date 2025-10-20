import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { MessageToolbarTriggerNode } from './MessageToolbarTriggerNode.js';
import { ChatMessageSchema } from '../../../schemas.js';
import { SpecNode } from '../../../flow-spec.js';

export const MessageToolbarTriggerNodeDataSchema = z.object({
  buttonText: z.string().min(1, 'Button text cannot be empty').default('Run Flow'),
  icon: z.string().default('fa-solid fa-play'),
  _version: z.number().optional(),
});
export type MessageToolbarTriggerNodeData = z.infer<typeof MessageToolbarTriggerNodeDataSchema>;

const execute: NodeExecutor = async (_node, input) => {
  return { ...input };
};

const BUTTON_CLASS = 'flowchart-message-toolbar-button';

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
  register: (flowId: string, node: SpecNode) => {
    const messageTemplateButtons = document.querySelector('#message_template .mes_buttons .extraMesButtons');
    if (!messageTemplateButtons) return;

    const menuData = node.data as MessageToolbarTriggerNodeData;
    const button = document.createElement('div');
    button.className = `mes_button ${BUTTON_CLASS} ${menuData.icon} interactable`;
    button.title = menuData.buttonText;
    button.tabIndex = 0;
    button.dataset.flowId = flowId;
    button.dataset.nodeId = node.id;

    messageTemplateButtons.prepend(button);
  },
  unregisterAll: () => {
    document.querySelectorAll(`#message_template .${BUTTON_CLASS}`).forEach((btn) => btn.remove());
  },
};

registrator.register(messageToolbarTriggerNodeDefinition);

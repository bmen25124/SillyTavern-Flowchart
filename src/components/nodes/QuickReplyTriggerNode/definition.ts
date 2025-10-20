import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { QuickReplyTriggerNode } from './QuickReplyTriggerNode.js';

export const QuickReplyTriggerNodeDataSchema = z.object({
  buttonText: z.string().min(1, 'Button text is required').default('Run Flow'),
  icon: z.string().default('fa-solid fa-bolt').describe('Optional Font Awesome icon class, e.g., fa-solid fa-play'),
  group: z.string().min(1, 'Group name is required').default('default'),
  order: z.number().default(0),
  _version: z.number().optional(),
});
export type QuickReplyTriggerNodeData = z.infer<typeof QuickReplyTriggerNodeDataSchema>;

const execute: NodeExecutor = async (_node, input) => {
  // Triggers just pass through the initial data from the event.
  return { ...input };
};

export const quickReplyTriggerNodeDefinition: NodeDefinition<QuickReplyTriggerNodeData> = {
  type: 'quickReplyTriggerNode',
  label: 'QR Button Trigger',
  category: 'Trigger',
  component: QuickReplyTriggerNode,
  dataSchema: QuickReplyTriggerNodeDataSchema,
  currentVersion: 1,
  initialData: {
    buttonText: 'My Action',
    icon: 'fa-solid fa-bolt',
    group: 'default',
    order: 0,
  },
  handles: {
    inputs: [],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  execute,
};

registrator.register(quickReplyTriggerNodeDefinition);

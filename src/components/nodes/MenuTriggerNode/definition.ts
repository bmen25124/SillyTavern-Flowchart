import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { MenuTriggerNode } from './MenuTriggerNode.js';

export const MenuTriggerNodeDataSchema = z.object({
  buttonText: z.string().min(1, 'Button text cannot be empty').default('Run My Flow'),
  icon: z.string().default('fa-solid fa-play'),
  _version: z.number().optional(),
});
export type MenuTriggerNodeData = z.infer<typeof MenuTriggerNodeDataSchema>;

const execute: NodeExecutor = async (_node, input) => {
  return { ...input };
};

export const menuTriggerNodeDefinition: NodeDefinition<MenuTriggerNodeData> = {
  type: 'menuTriggerNode',
  label: 'Menu Trigger',
  category: 'Trigger',
  component: MenuTriggerNode,
  dataSchema: MenuTriggerNodeDataSchema,
  currentVersion: 1,
  initialData: { buttonText: 'Run My Flow', icon: 'fa-solid fa-play' },
  handles: {
    inputs: [],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  execute,
};

registrator.register(menuTriggerNodeDefinition);

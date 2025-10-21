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

const CONTAINER_ID = 'flowchart_menu_buttons';

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
  register: (flowId, node, runner) => {
    const extensionsMenu = document.querySelector('#extensionsMenu');
    if (!extensionsMenu) return;

    let container = document.getElementById(CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = CONTAINER_ID;
      container.className = 'extension_container';
      extensionsMenu.appendChild(container);
    }

    const menuData = node.data as MenuTriggerNodeData;
    const button = document.createElement('div');
    button.className = 'list-group-item flex-container flexGap5 interactable';
    button.tabIndex = 0;
    button.setAttribute('role', 'listitem');
    button.innerHTML = `<div class="${menuData.icon} extensionsMenuExtensionButton"></div><span>${menuData.buttonText}</span>`;

    button.addEventListener('click', () => {
      runner.executeFlow(flowId, {}, 0, { activatedNodeId: node.id });
    });

    container.appendChild(button);
  },
  unregisterAll: () => {
    document.getElementById(CONTAINER_ID)?.remove();
  },
};

registrator.register(menuTriggerNodeDefinition);

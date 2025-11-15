import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { QuickReplyTriggerNode } from './QuickReplyTriggerNode.js';
import { SpecNode } from '../../../flow-spec.js';
import { settingsManager } from '../../../config.js';

export const QuickReplyTriggerNodeDataSchema = z.object({
  buttonText: z.string().min(1, 'Button text is required').default('Run Flow'),
  icon: z.string().default('fa-solid fa-bolt').describe('Optional Font Awesome icon class, e.g., fa-solid fa-play'),
  group: z.string().min(1, 'Group name is required').default('default'),
  order: z.number().default(0),
  _version: z.number().optional(),
});
export type QuickReplyTriggerNodeData = z.infer<typeof QuickReplyTriggerNodeDataSchema>;

type QrButtonInfo = QuickReplyTriggerNodeData & { flowId: string; nodeId: string };
let qrButtonInfos: QrButtonInfo[] = [];

/**
 * Clears any existing flowchart QR buttons from the DOM.
 */
function clearQrButtonsFromDom() {
  document
    .querySelectorAll('#qr--bar .flowchart-qr-group, #qr--popout .flowchart-qr-group')
    .forEach((el) => el.remove());
}

export function renderAllQrButtons() {
  // First, clear any existing buttons to prevent duplicates when re-rendering.
  clearQrButtonsFromDom();

  // Prioritize the popout's body if it exists, otherwise fall back to the bar.
  const qrContainer = document.querySelector('#qr--popout .qr--body') ?? document.querySelector('#qr--bar');
  if (!qrContainer) return;

  const qrButtonsByGroup: Record<string, QrButtonInfo[]> = {};
  for (const info of qrButtonInfos) {
    if (!qrButtonsByGroup[info.group]) {
      qrButtonsByGroup[info.group] = [];
    }
    qrButtonsByGroup[info.group].push(info);
  }

  if (Object.keys(qrButtonsByGroup).length === 0) return;

  const settings = settingsManager.getSettings();
  const groupOrder = settings.qrGroupOrder || [];
  const sortedGroupNames = Object.keys(qrButtonsByGroup).sort((a, b) => {
    const indexA = groupOrder.indexOf(a);
    const indexB = groupOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  for (const groupName of sortedGroupNames) {
    const buttons = qrButtonsByGroup[groupName];
    buttons.sort((a, b) => a.order - b.order);

    const groupEl = document.createElement('div');
    groupEl.className = 'qr--buttons qr--color qr--borderColor flowchart-qr-group';

    for (const btnData of buttons) {
      const buttonEl = document.createElement('div');
      buttonEl.className = 'qr--button menu_button interactable flowchart-qr-button';
      buttonEl.title = btnData.buttonText;
      buttonEl.dataset.flowId = btnData.flowId;
      buttonEl.dataset.nodeId = btnData.nodeId;
      const iconHtml = btnData.icon ? `<i class="${btnData.icon}"></i>` : '';
      buttonEl.innerHTML = `<div class="qr--button-label">${iconHtml} ${btnData.buttonText}</div>`;
      groupEl.appendChild(buttonEl);
    }
    qrContainer.appendChild(groupEl);
  }
}

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
  register: (flowId: string, node: SpecNode) => {
    qrButtonInfos.push({ ...(node.data as QuickReplyTriggerNodeData), flowId, nodeId: node.id });
  },
  unregisterAll: () => {
    qrButtonInfos = [];
    clearQrButtonsFromDom();
  },
};

registrator.register(quickReplyTriggerNodeDefinition);

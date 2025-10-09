// @ts-ignore
import { updateMessageBlock } from '../../../../../script.js';

import { Node, Edge } from '@xyflow/react';
import { DEFAULT_PROMPT_JSON, DEFAULT_PROMPT_XML, FlowData } from './constants.js';

export enum PromptEngineeringMode {
  NATIVE = 'native',
  JSON = 'json',
  XML = 'xml',
}

export interface ExtensionSettings {
  version: string;
  formatVersion: string;
  enabled: boolean;
  prompts: {
    json: string;
    xml: string;
  };
  flows: Record<string, FlowData>;
  activeFlow: string;
}

export const EXTENSION_NAME = 'SillyTavern-FlowChart';
export const EXTENSION_KEY = 'flowchart';

const VERSION = '0.1.0';
const FORMAT_VERSION = 'F_1.0';

/**
 * Generates a valid default flow with unique IDs.
 * This prevents state conflicts and ensures the initial state is always valid.
 */
export function createDefaultFlow(): FlowData {
  const triggerNodeId = crypto.randomUUID();
  const ifNodeId = crypto.randomUUID();

  const nodes: Node[] = [
    {
      id: triggerNodeId,
      type: 'triggerNode',
      position: { x: 50, y: 100 },
      data: { selectedEventType: 'user_message_rendered' },
    },
    {
      id: ifNodeId,
      type: 'ifNode',
      position: { x: 300, y: 100 },
      data: { conditions: [{ id: crypto.randomUUID(), code: 'return input.messageId > 10;' }] },
    },
  ];

  // The default flow starts with no edges to ensure it is always valid.
  // A trigger node cannot have outgoing connections.
  const edges: Edge[] = [];

  return { nodes, edges };
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  version: VERSION,
  formatVersion: FORMAT_VERSION,
  enabled: true,
  prompts: {
    json: DEFAULT_PROMPT_JSON,
    xml: DEFAULT_PROMPT_XML,
  },
  activeFlow: 'Default',
  flows: {
    Default: createDefaultFlow(),
  },
};

export function st_updateMessageBlock(messageId: number, message: object, { rerenderMessage = true } = {}): void {
  updateMessageBlock(messageId, message, { rerenderMessage });
}

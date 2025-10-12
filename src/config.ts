// @ts-ignore
import { updateMessageBlock } from '../../../../../script.js';

import { SpecFlow, SpecNode } from './flow-spec.js';
import { DEFAULT_PROMPT_JSON, DEFAULT_PROMPT_XML } from './constants.js';
import { ExtensionSettingsManager } from 'sillytavern-utils-lib';

export enum PromptEngineeringMode {
  NATIVE = 'native',
  JSON = 'json',
  XML = 'xml',
}

export const STRUCTURED_REQUEST_JSON_PROMPT_KEY = 'json';
export const STRUCTURED_REQUEST_XML_PROMPT_KEY = 'xml';

export interface ExtensionSettings {
  version: string;
  formatVersion: string;
  enabled: boolean;
  prompts: Record<string, string>;
  flows: Record<string, SpecFlow>;
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
export function createDefaultFlow(): SpecFlow {
  const triggerNodeId = crypto.randomUUID();
  const ifNodeId = crypto.randomUUID();

  const nodes: SpecNode[] = [
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

  return { nodes, edges: [] };
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  version: VERSION,
  formatVersion: FORMAT_VERSION,
  enabled: true,
  prompts: {
    [STRUCTURED_REQUEST_JSON_PROMPT_KEY]: DEFAULT_PROMPT_JSON,
    [STRUCTURED_REQUEST_XML_PROMPT_KEY]: DEFAULT_PROMPT_XML,
  },
  activeFlow: 'Default',
  flows: {
    Default: createDefaultFlow(),
  },
};

export const settingsManager = new ExtensionSettingsManager<ExtensionSettings>(EXTENSION_KEY, DEFAULT_SETTINGS);

export function st_updateMessageBlock(messageId: number, message: object, { rerenderMessage = true } = {}): void {
  updateMessageBlock(messageId, message, { rerenderMessage });
}

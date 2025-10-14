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

export const LLM_REQUEST_JSON_PROMPT_KEY = 'json';
export const LLM_REQUEST_XML_PROMPT_KEY = 'xml';

export interface FlowData {
  id: string; // The immutable unique ID
  name: string; // The mutable, user-facing name
  flow: SpecFlow;
  allowJsExecution?: boolean;
}

export interface ExtensionSettings {
  version: string;
  formatVersion: string;
  enabled: boolean;
  prompts: Record<string, string>;
  flows: FlowData[];
  enabledFlows: Record<string, boolean>; // Key is immutable flow ID
  activeFlow: string; // Stores the immutable flow ID
  isPaletteCollapsed: boolean;
  showExecutionNotifications: boolean;
}

export const EXTENSION_NAME = 'SillyTavern-FlowChart';
export const EXTENSION_KEY = 'flowchart';

const VERSION = '0.3.0';
const FORMAT_VERSION = 'F_1.0';

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

const defaultFlowId = 'default';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  version: VERSION,
  formatVersion: FORMAT_VERSION,
  enabled: true,
  prompts: {
    [LLM_REQUEST_JSON_PROMPT_KEY]: DEFAULT_PROMPT_JSON,
    [LLM_REQUEST_XML_PROMPT_KEY]: DEFAULT_PROMPT_XML,
  },
  activeFlow: defaultFlowId,
  flows: [
    {
      id: defaultFlowId,
      name: 'default',
      flow: createDefaultFlow(),
      allowJsExecution: false,
    },
  ],
  enabledFlows: {
    [defaultFlowId]: true,
  },
  isPaletteCollapsed: false,
  showExecutionNotifications: true,
};

export const settingsManager = new ExtensionSettingsManager<ExtensionSettings>(EXTENSION_KEY, DEFAULT_SETTINGS);

export function st_updateMessageBlock(messageId: number, message: object, { rerenderMessage = true } = {}): void {
  updateMessageBlock(messageId, message, { rerenderMessage });
}

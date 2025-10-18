// @ts-ignore
import { updateMessageBlock } from '../../../../../script.js';

// @ts-ignore
import { hideChatMessageRange } from '../../../../chats.js';

// @ts-ignore
import { setLocalVariable, getLocalVariable, setGlobalVariable, getGlobalVariable } from '../../../../variables.js';

import { SpecFlow } from './flow-spec.js';
import { DEFAULT_PROMPT_JSON, DEFAULT_PROMPT_XML } from './constants.js';
import { ExtensionSettingsManager } from 'sillytavern-utils-lib';
import { CURRENT_FLOW_VERSION } from './flow-migrations.js';

export enum PromptEngineeringMode {
  NATIVE = 'native',
  JSON = 'json',
  XML = 'xml',
}

export const LLM_REQUEST_JSON_PROMPT_KEY = 'json';
export const LLM_REQUEST_XML_PROMPT_KEY = 'xml';

export interface FlowData {
  id: string;
  name: string;
  flow: SpecFlow;
  flowVersion: string;
  enabled: boolean;
  allowDangerousExecution: boolean;
}

export interface ExtensionSettings {
  version: string;
  formatVersion: string;
  enabled: boolean;
  prompts: Record<string, string>;
  flows: FlowData[];
  activeFlow: string;
  isPaletteCollapsed: boolean;
  showExecutionNotifications: boolean;
}

export const EXTENSION_NAME = 'SillyTavern-Flowchart';
export const EXTENSION_KEY = 'flowchart';

const VERSION = '0.3.0';
const FORMAT_VERSION = 'F_1.0';

export function createDefaultFlow(): SpecFlow {
  return { nodes: [], edges: [] };
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
      flowVersion: CURRENT_FLOW_VERSION,
      allowDangerousExecution: false,
      enabled: true,
    },
  ],
  isPaletteCollapsed: false,
  showExecutionNotifications: true,
};

export const settingsManager = new ExtensionSettingsManager<ExtensionSettings>(EXTENSION_KEY, DEFAULT_SETTINGS);

export function st_updateMessageBlock(messageId: number, message: object, { rerenderMessage = true } = {}): void {
  updateMessageBlock(messageId, message, { rerenderMessage });
}

export async function st_hideChatMessageRange(start: number, end: number, unhide: boolean) {
  await hideChatMessageRange(start, end, unhide);
}

export function st_setLocalVariable(name: string, value: unknown, args?: object) {
  setLocalVariable(name, value, args);
}

export function st_getLocalVariable(name: string, args?: object): unknown {
  return getLocalVariable(name, args);
}

export function st_setGlobalVariable(name: string, value: unknown) {
  setGlobalVariable(name, value);
}

export function st_getGlobalVariable(name: string): unknown {
  return getGlobalVariable(name);
}

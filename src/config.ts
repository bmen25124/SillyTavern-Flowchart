// @ts-ignore
import { updateMessageBlock } from '../../../../../script.js';
import { DEFAULT_PROMPT_JSON, DEFAULT_PROMPT_XML } from './constants.js';

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
}

export const EXTENSION_NAME = 'SillyTavern-FlowChart';
export const EXTENSION_KEY = 'flowchart';

const VERSION = '0.1.0';
const FORMAT_VERSION = 'F_1.0';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  version: VERSION,
  formatVersion: FORMAT_VERSION,
  enabled: true,
  prompts: {
    json: DEFAULT_PROMPT_JSON,
    xml: DEFAULT_PROMPT_XML,
  },
};

export function st_updateMessageBlock(messageId: number, message: object, { rerenderMessage = true } = {}): void {
  updateMessageBlock(messageId, message, { rerenderMessage });
}

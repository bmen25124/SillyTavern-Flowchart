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

const DEFAULT_FLOW_NODES: Node[] = [
  {
    id: 'n1',
    type: 'starterNode',
    position: { x: 0, y: 0 },
    data: { selectedEventType: 'user_message_rendered' },
    width: 200,
  },
  {
    id: 'n2',
    type: 'ifNode',
    position: { x: 250, y: 0 },
    data: { conditions: [{ id: crypto.randomUUID(), code: 'input.messageId > 10' }] },
  },
];
const DEFAULT_FLOW_EDGES: Edge[] = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];

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
    Default: {
      nodes: DEFAULT_FLOW_NODES,
      edges: DEFAULT_FLOW_EDGES,
    },
  },
};

export function st_updateMessageBlock(messageId: number, message: object, { rerenderMessage = true } = {}): void {
  updateMessageBlock(messageId, message, { rerenderMessage });
}

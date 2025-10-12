import { createCharacterNodeDefinition, editCharacterNodeDefinition, getCharacterNodeDefinition } from './character.js';
import { manualTriggerNodeDefinition, triggerNodeDefinition } from './core.js';
import { stringNodeDefinition, numberNodeDefinition, profileIdNodeDefinition } from './input.js';
import { jsonNodeDefinition, schemaNodeDefinition } from './json.js';
import { ifNodeDefinition } from './logic.js';
import {
  createLorebookNodeDefinition,
  createLorebookEntryNodeDefinition,
  editLorebookEntryNodeDefinition,
  getLorebookEntryNodeDefinition,
  getLorebookNodeDefinition,
} from './lorebook.js';
import {
  createMessagesNodeDefinition,
  customMessageNodeDefinition,
  mergeMessagesNodeDefinition,
  structuredRequestNodeDefinition,
} from './messaging.js';

import { NodeDefinition } from './types.js';
import {
  logNodeDefinition,
  handlebarNodeDefinition,
  mergeObjectsNodeDefinition,
  groupNodeDefinition,
  executeJsNodeDefinition,
} from './utility.js';

export const allNodeDefinitions: NodeDefinition[] = [
  // Core
  triggerNodeDefinition,
  manualTriggerNodeDefinition,
  // Logic
  ifNodeDefinition,
  // Input
  stringNodeDefinition,
  numberNodeDefinition,
  profileIdNodeDefinition,
  // Messaging
  createMessagesNodeDefinition,
  customMessageNodeDefinition,
  mergeMessagesNodeDefinition,
  structuredRequestNodeDefinition,
  // Character
  getCharacterNodeDefinition,
  createCharacterNodeDefinition,
  editCharacterNodeDefinition,
  // Lorebook
  getLorebookNodeDefinition,
  getLorebookEntryNodeDefinition,
  createLorebookNodeDefinition,
  createLorebookEntryNodeDefinition,
  editLorebookEntryNodeDefinition,
  // JSON
  jsonNodeDefinition,
  schemaNodeDefinition,
  // Utility
  logNodeDefinition,
  handlebarNodeDefinition,
  mergeObjectsNodeDefinition,
  groupNodeDefinition,
  executeJsNodeDefinition,
];

export const nodeDefinitionMap = new Map<string, NodeDefinition>(allNodeDefinitions.map((def) => [def.type, def]));

export const nodeTypes = Object.fromEntries(allNodeDefinitions.map((def) => [def.type, def.component]));

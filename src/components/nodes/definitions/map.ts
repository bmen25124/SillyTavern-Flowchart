// This file provides a UI-free map of node definitions for use in logic and tests.
import {
  CreateCharacterNodeData,
  CreateCharacterNodeDataSchema,
  CreateLorebookEntryNodeData,
  CreateLorebookEntryNodeDataSchema,
  CreateLorebookNodeData,
  CreateLorebookNodeDataSchema,
  CreateMessagesNodeData,
  CreateMessagesNodeDataSchema,
  CustomMessageNodeData,
  CustomMessageNodeDataSchema,
  EditCharacterNodeData,
  EditCharacterNodeDataSchema,
  EditLorebookEntryNodeData,
  EditLorebookEntryNodeDataSchema,
  ExecuteJsNodeData,
  ExecuteJsNodeDataSchema,
  FlowDataType,
  GetCharacterNodeData,
  GetCharacterNodeDataSchema,
  GetLorebookEntryNodeData,
  GetLorebookEntryNodeDataSchema,
  GetLorebookNodeData,
  GetLorebookNodeDataSchema,
  GroupNodeData,
  GroupNodeDataSchema,
  HandlebarNodeData,
  HandlebarNodeDataSchema,
  IfNodeData,
  IfNodeDataSchema,
  JsonNodeData,
  JsonNodeDataSchema,
  LogNodeData,
  LogNodeDataSchema,
  ManualTriggerNodeData,
  ManualTriggerNodeDataSchema,
  MergeMessagesNodeData,
  MergeMessagesNodeDataSchema,
  MergeObjectsNodeData,
  MergeObjectsNodeDataSchema,
  NumberNodeData,
  NumberNodeDataSchema,
  ProfileIdNodeData,
  ProfileIdNodeDataSchema,
  SchemaNodeData,
  SchemaNodeDataSchema,
  StringNodeData,
  StringNodeDataSchema,
  StructuredRequestNodeData,
  StructuredRequestNodeDataSchema,
  TriggerNodeData,
  TriggerNodeDataSchema,
} from '../../../flow-types.js';
import { NodeDefinition } from './types.js';
import { EventNames } from 'sillytavern-utils-lib/types';
import { PromptEngineeringMode } from '../../../config.js';

type BaseNodeDefinition<T = any> = Omit<NodeDefinition<T>, 'component'>;

// from character.ts
const getCharacterNodeDefinition: BaseNodeDefinition<GetCharacterNodeData> = {
  type: 'getCharacterNode',
  label: 'Get Character',
  category: 'Character',
  dataSchema: GetCharacterNodeDataSchema,
  initialData: { characterAvatar: '' },
  handles: {
    inputs: [{ id: 'characterAvatar', type: FlowDataType.STRING }],
    outputs: [
      { id: 'result', type: FlowDataType.OBJECT },
      { id: 'name', type: FlowDataType.STRING },
      { id: 'description', type: FlowDataType.STRING },
      { id: 'first_mes', type: FlowDataType.STRING },
      { id: 'scenario', type: FlowDataType.STRING },
      { id: 'personality', type: FlowDataType.STRING },
      { id: 'mes_example', type: FlowDataType.STRING },
      { id: 'tags', type: FlowDataType.OBJECT },
    ],
  },
};
const createCharacterNodeDefinition: BaseNodeDefinition<CreateCharacterNodeData> = {
  type: 'createCharacterNode',
  label: 'Create Character',
  category: 'Character',
  dataSchema: CreateCharacterNodeDataSchema,
  initialData: { name: 'New Character' },
  handles: {
    inputs: [
      { id: 'name', type: FlowDataType.STRING },
      { id: 'description', type: FlowDataType.STRING },
      { id: 'first_mes', type: FlowDataType.STRING },
      { id: 'scenario', type: FlowDataType.STRING },
      { id: 'personality', type: FlowDataType.STRING },
      { id: 'mes_example', type: FlowDataType.STRING },
      { id: 'tags', type: FlowDataType.STRING },
    ],
    outputs: [{ id: null, type: FlowDataType.STRING }],
  },
};
const editCharacterNodeDefinition: BaseNodeDefinition<EditCharacterNodeData> = {
  type: 'editCharacterNode',
  label: 'Edit Character',
  category: 'Character',
  dataSchema: EditCharacterNodeDataSchema,
  initialData: { characterAvatar: '' },
  handles: {
    inputs: [
      { id: 'characterAvatar', type: FlowDataType.STRING },
      { id: 'name', type: FlowDataType.STRING },
      { id: 'description', type: FlowDataType.STRING },
      { id: 'first_mes', type: FlowDataType.STRING },
      { id: 'scenario', type: FlowDataType.STRING },
      { id: 'personality', type: FlowDataType.STRING },
      { id: 'mes_example', type: FlowDataType.STRING },
      { id: 'tags', type: FlowDataType.STRING },
    ],
    outputs: [{ id: null, type: FlowDataType.STRING }],
  },
};

// from core.ts
const triggerNodeDefinition: BaseNodeDefinition<TriggerNodeData> = {
  type: 'triggerNode',
  label: 'Event Trigger',
  category: 'Trigger',
  dataSchema: TriggerNodeDataSchema,
  initialData: { selectedEventType: EventNames.USER_MESSAGE_RENDERED },
  handles: { inputs: [], outputs: [] },
};
const manualTriggerNodeDefinition: BaseNodeDefinition<ManualTriggerNodeData> = {
  type: 'manualTriggerNode',
  label: 'Manual Trigger',
  category: 'Trigger',
  dataSchema: ManualTriggerNodeDataSchema,
  initialData: { payload: '{\n  "name": "World"\n}' },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.OBJECT }] },
};

// from input.ts
const stringNodeDefinition: BaseNodeDefinition<StringNodeData> = {
  type: 'stringNode',
  label: 'String',
  category: 'Input',
  dataSchema: StringNodeDataSchema,
  initialData: { value: 'hello' },
  handles: {
    inputs: [{ id: 'value', type: FlowDataType.ANY }],
    outputs: [{ id: 'value', type: FlowDataType.STRING }],
  },
};
const numberNodeDefinition: BaseNodeDefinition<NumberNodeData> = {
  type: 'numberNode',
  label: 'Number',
  category: 'Input',
  dataSchema: NumberNodeDataSchema,
  initialData: { value: 123 },
  handles: {
    inputs: [{ id: 'value', type: FlowDataType.ANY }],
    outputs: [{ id: 'value', type: FlowDataType.NUMBER }],
  },
};
const profileIdNodeDefinition: BaseNodeDefinition<ProfileIdNodeData> = {
  type: 'profileIdNode',
  label: 'Profile ID',
  category: 'Input',
  dataSchema: ProfileIdNodeDataSchema,
  initialData: { profileId: '' },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.PROFILE_ID }] },
};

// from json.ts
const jsonNodeDefinition: BaseNodeDefinition<JsonNodeData> = {
  type: 'jsonNode',
  label: 'JSON',
  category: 'JSON',
  dataSchema: JsonNodeDataSchema,
  initialData: { items: [] },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.OBJECT }] },
};
const schemaNodeDefinition: BaseNodeDefinition<SchemaNodeData> = {
  type: 'schemaNode',
  label: 'Schema',
  category: 'JSON',
  dataSchema: SchemaNodeDataSchema,
  initialData: { fields: [] },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.SCHEMA }] },
};

// from logic.ts
const ifNodeDefinition: BaseNodeDefinition<IfNodeData> = {
  type: 'ifNode',
  label: 'If',
  category: 'Logic',
  dataSchema: IfNodeDataSchema,
  initialData: { conditions: [{ id: crypto.randomUUID(), code: 'return true;' }] },
  handles: {
    inputs: [{ id: null, type: FlowDataType.ANY }],
    outputs: [{ id: 'false', type: FlowDataType.ANY }],
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'output') {
      const isConditionHandle = (node.data as IfNodeData).conditions.some((c) => c.id === handleId);
      if (handleId === 'false' || isConditionHandle) return FlowDataType.ANY;
    }
    return undefined;
  },
};

// from lorebook.ts
const createLorebookNodeDefinition: BaseNodeDefinition<CreateLorebookNodeData> = {
  type: 'createLorebookNode',
  label: 'Create Lorebook',
  category: 'Lorebook',
  dataSchema: CreateLorebookNodeDataSchema,
  initialData: { worldName: 'My Lorebook' },
  handles: {
    inputs: [{ id: 'worldName', type: FlowDataType.STRING }],
    outputs: [{ id: null, type: FlowDataType.STRING }],
  },
};
const createLorebookEntryNodeDefinition: BaseNodeDefinition<CreateLorebookEntryNodeData> = {
  type: 'createLorebookEntryNode',
  label: 'Create Lorebook Entry',
  category: 'Lorebook',
  dataSchema: CreateLorebookEntryNodeDataSchema,
  initialData: { worldName: '', key: '', content: '', comment: '' },
  handles: {
    inputs: [
      { id: 'worldName', type: FlowDataType.STRING },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
    ],
    outputs: [{ id: null, type: FlowDataType.OBJECT }],
  },
};
const editLorebookEntryNodeDefinition: BaseNodeDefinition<EditLorebookEntryNodeData> = {
  type: 'editLorebookEntryNode',
  label: 'Edit Lorebook Entry',
  category: 'Lorebook',
  dataSchema: EditLorebookEntryNodeDataSchema,
  initialData: { worldName: '', entryUid: undefined },
  handles: {
    inputs: [
      { id: 'worldName', type: FlowDataType.STRING },
      { id: 'entryUid', type: FlowDataType.NUMBER },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
    ],
    outputs: [{ id: null, type: FlowDataType.OBJECT }],
  },
};
const getLorebookNodeDefinition: BaseNodeDefinition<GetLorebookNodeData> = {
  type: 'getLorebookNode',
  label: 'Get Lorebook',
  category: 'Lorebook',
  dataSchema: GetLorebookNodeDataSchema,
  initialData: { worldName: '' },
  handles: {
    inputs: [{ id: 'worldName', type: FlowDataType.STRING }],
    outputs: [{ id: 'entries', type: FlowDataType.OBJECT }],
  },
};
const getLorebookEntryNodeDefinition: BaseNodeDefinition<GetLorebookEntryNodeData> = {
  type: 'getLorebookEntryNode',
  label: 'Get Lorebook Entry',
  category: 'Lorebook',
  dataSchema: GetLorebookEntryNodeDataSchema,
  initialData: { worldName: '', entryUid: undefined },
  handles: {
    inputs: [
      { id: 'worldName', type: FlowDataType.STRING },
      { id: 'entryUid', type: FlowDataType.NUMBER },
    ],
    outputs: [
      { id: 'entry', type: FlowDataType.OBJECT },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
    ],
  },
};

// from messaging.ts
const createMessagesNodeDefinition: BaseNodeDefinition<CreateMessagesNodeData> = {
  type: 'createMessagesNode',
  label: 'Create Messages',
  category: 'Messaging',
  dataSchema: CreateMessagesNodeDataSchema,
  initialData: { profileId: '' },
  handles: {
    inputs: [
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
      { id: 'lastMessageId', type: FlowDataType.NUMBER },
    ],
    outputs: [{ id: null, type: FlowDataType.MESSAGES }],
  },
};
const customMessageNodeDefinition: BaseNodeDefinition<CustomMessageNodeData> = {
  type: 'customMessageNode',
  label: 'Custom Message',
  category: 'Messaging',
  dataSchema: CustomMessageNodeDataSchema,
  initialData: { messages: [{ id: crypto.randomUUID(), role: 'system', content: 'You are a helpful assistant.' }] },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.MESSAGES }] },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'input') {
      if ((node.data as CustomMessageNodeData).messages.some((m) => m.id === handleId)) return FlowDataType.STRING;
    }
    return undefined;
  },
};
const mergeMessagesNodeDefinition: BaseNodeDefinition<MergeMessagesNodeData> = {
  type: 'mergeMessagesNode',
  label: 'Merge Messages',
  category: 'Messaging',
  dataSchema: MergeMessagesNodeDataSchema,
  initialData: { inputCount: 2 },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.MESSAGES }] },
  getHandleType: ({ handleId, handleDirection }) => {
    if (handleDirection === 'input' && handleId?.startsWith('messages_')) return FlowDataType.MESSAGES;
    return undefined;
  },
};
const structuredRequestNodeDefinition: BaseNodeDefinition<StructuredRequestNodeData> = {
  type: 'structuredRequestNode',
  label: 'Structured Request',
  category: 'Messaging',
  dataSchema: StructuredRequestNodeDataSchema,
  initialData: {
    profileId: '',
    schemaName: 'mySchema',
    promptEngineeringMode: PromptEngineeringMode.NATIVE,
    maxResponseToken: 1000,
  },
  handles: {
    inputs: [
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
      { id: 'messages', type: FlowDataType.MESSAGES },
      { id: 'schema', type: FlowDataType.SCHEMA },
      { id: 'maxResponseToken', type: FlowDataType.NUMBER },
    ],
    outputs: [{ id: 'result', type: FlowDataType.STRUCTURED_RESULT }],
  },
  getHandleType: ({ handleId, handleDirection, node, nodes, edges }) => {
    if (handleDirection === 'output') {
      if (handleId === 'result') return FlowDataType.STRUCTURED_RESULT;
      const schemaEdge = edges.find((edge) => edge.target === node.id && edge.targetHandle === 'schema');
      if (!schemaEdge) return FlowDataType.ANY;
      const schemaNode = nodes.find((node) => node.id === schemaEdge.source);
      if (schemaNode?.type !== 'schemaNode' || !Array.isArray(schemaNode.data.fields)) return FlowDataType.ANY;
      const field = schemaNode.data.fields.find((f: any) => f.name === handleId);
      if (!field) return undefined;
      switch (field.type) {
        case 'string':
          return FlowDataType.STRING;
        case 'number':
          return FlowDataType.NUMBER;
        case 'boolean':
          return FlowDataType.BOOLEAN;
        default:
          return FlowDataType.OBJECT;
      }
    }
    return undefined;
  },
};

// from utility.ts
const logNodeDefinition: BaseNodeDefinition<LogNodeData> = {
  type: 'logNode',
  label: 'Log',
  category: 'Utility',
  dataSchema: LogNodeDataSchema,
  initialData: { prefix: 'Log:' },
  handles: {
    inputs: [{ id: 'value', type: FlowDataType.ANY }],
    outputs: [{ id: 'value', type: FlowDataType.ANY }],
  },
};
const handlebarNodeDefinition: BaseNodeDefinition<HandlebarNodeData> = {
  type: 'handlebarNode',
  label: 'Handlebar',
  category: 'Utility',
  dataSchema: HandlebarNodeDataSchema,
  initialData: { template: 'Hello, {{name}}!' },
  handles: {
    inputs: [
      { id: 'template', type: FlowDataType.STRING },
      { id: 'data', type: FlowDataType.OBJECT },
    ],
    outputs: [{ id: 'result', type: FlowDataType.STRING }],
  },
};
const mergeObjectsNodeDefinition: BaseNodeDefinition<MergeObjectsNodeData> = {
  type: 'mergeObjectsNode',
  label: 'Merge Objects',
  category: 'Utility',
  dataSchema: MergeObjectsNodeDataSchema,
  initialData: { inputCount: 2 },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.OBJECT }] },
  getHandleType: ({ handleId, handleDirection }) => {
    if (handleDirection === 'input' && handleId?.startsWith('object_')) return FlowDataType.OBJECT;
    return undefined;
  },
};
const groupNodeDefinition: BaseNodeDefinition<GroupNodeData> = {
  type: 'groupNode',
  label: 'Group',
  category: 'Utility',
  dataSchema: GroupNodeDataSchema,
  initialData: { label: 'Group' },
  handles: { inputs: [], outputs: [] },
};
const executeJsNodeDefinition: BaseNodeDefinition<ExecuteJsNodeData> = {
  type: 'executeJsNode',
  label: 'Execute JS Code',
  category: 'Utility',
  dataSchema: ExecuteJsNodeDataSchema,
  initialData: { code: 'return input;' },
  handles: {
    inputs: [{ id: null, type: FlowDataType.ANY }],
    outputs: [{ id: null, type: FlowDataType.ANY }],
  },
};

const allNodeDefinitionsBase: BaseNodeDefinition[] = [
  triggerNodeDefinition,
  manualTriggerNodeDefinition,
  ifNodeDefinition,
  stringNodeDefinition,
  numberNodeDefinition,
  profileIdNodeDefinition,
  createMessagesNodeDefinition,
  customMessageNodeDefinition,
  mergeMessagesNodeDefinition,
  structuredRequestNodeDefinition,
  getCharacterNodeDefinition,
  createCharacterNodeDefinition,
  editCharacterNodeDefinition,
  getLorebookNodeDefinition,
  getLorebookEntryNodeDefinition,
  createLorebookNodeDefinition,
  createLorebookEntryNodeDefinition,
  editLorebookEntryNodeDefinition,
  jsonNodeDefinition,
  schemaNodeDefinition,
  logNodeDefinition,
  handlebarNodeDefinition,
  mergeObjectsNodeDefinition,
  groupNodeDefinition,
  executeJsNodeDefinition,
];

export const nodeDefinitionMap = new Map<string, BaseNodeDefinition>(
  allNodeDefinitionsBase.map((def) => [def.type, def]),
);

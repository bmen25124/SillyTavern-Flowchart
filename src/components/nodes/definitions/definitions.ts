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
  EditChatMessageNodeData,
  EditChatMessageNodeDataSchema,
  EditLorebookEntryNodeData,
  EditLorebookEntryNodeDataSchema,
  ExecuteJsNodeData,
  ExecuteJsNodeDataSchema,
  FlowDataType,
  GetCharacterNodeData,
  GetCharacterNodeDataSchema,
  GetChatMessageNodeData,
  GetChatMessageNodeDataSchema,
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
  RemoveChatMessageNodeData,
  RemoveChatMessageNodeDataSchema,
  SchemaNodeData,
  SchemaNodeDataSchema,
  SendChatMessageNodeData,
  SendChatMessageNodeDataSchema,
  StringNodeData,
  StringNodeDataSchema,
  StructuredRequestNodeData,
  StructuredRequestNodeDataSchema,
  TriggerNodeData,
  TriggerNodeDataSchema,
  EventNameParameters,
  DateTimeNodeData,
  DateTimeNodeDataSchema,
  RandomNodeData,
  RandomNodeDataSchema,
  StringToolsNodeData,
  StringToolsNodeDataSchema,
  MathNodeData,
  MathNodeDataSchema,
  GetPromptNodeData,
  GetPromptNodeDataSchema,
  GetVariableNodeData,
  GetVariableNodeDataSchema,
  SetVariableNodeData,
  SetVariableNodeDataSchema,
  RegexNodeData,
  RegexNodeDataSchema,
  RunSlashCommandNodeData,
  RunSlashCommandNodeDataSchema,
  TypeConverterNodeData,
  TypeConverterNodeDataSchema,
} from '../../../flow-types.js';
import { BaseNodeDefinition } from './types.js';
import { EventNames } from 'sillytavern-utils-lib/types';
import { PromptEngineeringMode } from '../../../config.js';
import { z } from 'zod';
import {
  MERGE_MESSAGES_HANDLE_PREFIX,
  MERGE_OBJECTS_HANDLE_PREFIX,
  STRING_TOOLS_MERGE_HANDLE_PREFIX,
} from '../../../constants.js';

function zodTypeToFlowType(type: z.ZodType): FlowDataType {
  if (type instanceof z.ZodNumber) return FlowDataType.NUMBER;
  if (type instanceof z.ZodString) return FlowDataType.STRING;
  if (type instanceof z.ZodBoolean) return FlowDataType.BOOLEAN;
  return FlowDataType.ANY;
}

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

  getDynamicHandles: (data) => {
    const eventParams = EventNameParameters[data.selectedEventType];
    if (!eventParams) return { inputs: [], outputs: [] };
    const outputs = Object.keys(eventParams).map((paramName) => ({
      id: paramName,
      type: zodTypeToFlowType(eventParams[paramName]),
    }));
    return { inputs: [], outputs };
  },

  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'output') {
      const { selectedEventType } = node.data as TriggerNodeData;
      const eventParams = EventNameParameters[selectedEventType];
      if (eventParams && handleId && eventParams[handleId]) {
        return zodTypeToFlowType(eventParams[handleId]);
      }
    }
    return undefined;
  },
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
  handles: {
    inputs: [{ id: null, type: FlowDataType.ANY }],
    outputs: [{ id: null, type: FlowDataType.PROFILE_ID }],
  },
};

// from json.ts
const jsonNodeDefinition: BaseNodeDefinition<JsonNodeData> = {
  type: 'jsonNode',
  label: 'JSON',
  category: 'JSON',
  dataSchema: JsonNodeDataSchema,
  initialData: { items: [], rootType: 'object' },
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
  getDynamicHandles: (data) => ({
    inputs: [],
    outputs: data.conditions.map((c) => ({ id: c.id, type: FlowDataType.ANY })),
  }),
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
  category: 'API Request',
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
  category: 'API Request',
  dataSchema: CustomMessageNodeDataSchema,
  initialData: { messages: [{ id: crypto.randomUUID(), role: 'system', content: 'You are a helpful assistant.' }] },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.MESSAGES }] },
  getDynamicHandles: (data) => ({
    inputs: data.messages.map((m) => ({ id: m.id, type: FlowDataType.STRING })),
    outputs: [],
  }),
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
  category: 'API Request',
  dataSchema: MergeMessagesNodeDataSchema,
  initialData: { inputCount: 2 },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.MESSAGES }] },
  getDynamicHandles: (data) => {
    const inputs = [];
    for (let i = 0; i < data.inputCount; i++) {
      inputs.push({ id: `${MERGE_MESSAGES_HANDLE_PREFIX}${i}`, type: FlowDataType.MESSAGES });
    }
    return { inputs, outputs: [] };
  },
  getHandleType: ({ handleId, handleDirection }) => {
    if (handleDirection === 'input' && handleId?.startsWith(MERGE_MESSAGES_HANDLE_PREFIX)) return FlowDataType.MESSAGES;
    return undefined;
  },
};
const structuredRequestNodeDefinition: BaseNodeDefinition<StructuredRequestNodeData> = {
  type: 'structuredRequestNode',
  label: 'Structured Request',
  category: 'API Request',
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
const getChatMessageNodeDefinition: BaseNodeDefinition<GetChatMessageNodeData> = {
  type: 'getChatMessageNode',
  label: 'Get Chat Message',
  category: 'Chat',
  dataSchema: GetChatMessageNodeDataSchema,
  initialData: { messageId: 'last' },
  handles: {
    inputs: [{ id: 'messageId', type: FlowDataType.ANY }],
    outputs: [
      { id: 'id', type: FlowDataType.NUMBER },
      { id: 'result', type: FlowDataType.OBJECT },
      { id: 'name', type: FlowDataType.STRING },
      { id: 'mes', type: FlowDataType.STRING },
      { id: 'is_user', type: FlowDataType.BOOLEAN },
      { id: 'is_system', type: FlowDataType.BOOLEAN },
    ],
  },
};
const editChatMessageNodeDefinition: BaseNodeDefinition<EditChatMessageNodeData> = {
  type: 'editChatMessageNode',
  label: 'Edit Chat Message',
  category: 'Chat',
  dataSchema: EditChatMessageNodeDataSchema,
  initialData: {},
  handles: {
    inputs: [
      { id: 'messageId', type: FlowDataType.NUMBER },
      { id: 'message', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'messageObject', type: FlowDataType.OBJECT }],
  },
};
const sendChatMessageNodeDefinition: BaseNodeDefinition<SendChatMessageNodeData> = {
  type: 'sendChatMessageNode',
  label: 'Send Chat Message',
  category: 'Chat',
  dataSchema: SendChatMessageNodeDataSchema,
  initialData: { message: '', role: 'assistant' },
  handles: {
    inputs: [
      { id: 'message', type: FlowDataType.STRING },
      { id: 'role', type: FlowDataType.STRING },
      { id: 'name', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'messageId', type: FlowDataType.NUMBER }],
  },
};
const removeChatMessageNodeDefinition: BaseNodeDefinition<RemoveChatMessageNodeData> = {
  type: 'removeChatMessageNode',
  label: 'Remove Chat Message',
  category: 'Chat',
  dataSchema: RemoveChatMessageNodeDataSchema,
  initialData: {},
  handles: {
    inputs: [{ id: 'messageId', type: FlowDataType.NUMBER }],
    outputs: [],
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
  getDynamicHandles: (data) => {
    const inputs = [];
    for (let i = 0; i < data.inputCount; i++) {
      inputs.push({ id: `${MERGE_OBJECTS_HANDLE_PREFIX}${i}`, type: FlowDataType.OBJECT });
    }
    return { inputs, outputs: [] };
  },
  getHandleType: ({ handleId, handleDirection }) => {
    if (handleDirection === 'input' && handleId?.startsWith(MERGE_OBJECTS_HANDLE_PREFIX)) return FlowDataType.OBJECT;
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
const dateTimeNodeDefinition: BaseNodeDefinition<DateTimeNodeData> = {
  type: 'dateTimeNode',
  label: 'Date/Time',
  category: 'Utility',
  dataSchema: DateTimeNodeDataSchema,
  initialData: {},
  handles: {
    inputs: [{ id: 'format', type: FlowDataType.STRING }],
    outputs: [
      { id: 'iso', type: FlowDataType.STRING },
      { id: 'timestamp', type: FlowDataType.NUMBER },
      { id: 'year', type: FlowDataType.NUMBER },
      { id: 'month', type: FlowDataType.NUMBER },
      { id: 'day', type: FlowDataType.NUMBER },
      { id: 'hour', type: FlowDataType.NUMBER },
      { id: 'minute', type: FlowDataType.NUMBER },
      { id: 'second', type: FlowDataType.NUMBER },
    ],
  },
};
const randomNodeDefinition: BaseNodeDefinition<RandomNodeData> = {
  type: 'randomNode',
  label: 'Random',
  category: 'Utility',
  dataSchema: RandomNodeDataSchema,
  initialData: { mode: 'number', min: 0, max: 100 },
  handles: {
    inputs: [
      { id: 'min', type: FlowDataType.NUMBER },
      { id: 'max', type: FlowDataType.NUMBER },
      { id: 'array', type: FlowDataType.OBJECT },
    ],
    outputs: [{ id: 'result', type: FlowDataType.ANY }],
  },
};
const stringToolsNodeDefinition: BaseNodeDefinition<StringToolsNodeData> = {
  type: 'stringToolsNode',
  label: 'String Tools',
  category: 'Utility',
  dataSchema: StringToolsNodeDataSchema,
  initialData: { operation: 'merge', inputCount: 2, delimiter: '' },
  handles: {
    inputs: [{ id: 'delimiter', type: FlowDataType.STRING }],
    outputs: [{ id: 'result', type: FlowDataType.ANY }],
  },
  getDynamicHandles: (data) => {
    const inputs = [];
    if (data.operation === 'merge') {
      for (let i = 0; i < (data.inputCount ?? 2); i++) {
        inputs.push({ id: `${STRING_TOOLS_MERGE_HANDLE_PREFIX}${i}`, type: FlowDataType.STRING });
      }
    } else if (data.operation === 'split') {
      inputs.push({ id: 'string', type: FlowDataType.STRING });
    } else if (data.operation === 'join') {
      inputs.push({ id: 'array', type: FlowDataType.OBJECT });
    }
    return { inputs, outputs: [] };
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'input') {
      const data = node.data as StringToolsNodeData;
      if (data.operation === 'merge' && handleId?.startsWith(STRING_TOOLS_MERGE_HANDLE_PREFIX))
        return FlowDataType.STRING;
      if (data.operation === 'split' && handleId === 'string') return FlowDataType.STRING;
      if (data.operation === 'join' && handleId === 'array') return FlowDataType.OBJECT;
    }
    if (handleDirection === 'output' && handleId === 'result') {
      const data = node.data as StringToolsNodeData;
      if (data.operation === 'split') return FlowDataType.OBJECT;
      return FlowDataType.STRING;
    }
    return undefined;
  },
};
const mathNodeDefinition: BaseNodeDefinition<MathNodeData> = {
  type: 'mathNode',
  label: 'Math',
  category: 'Utility',
  dataSchema: MathNodeDataSchema,
  initialData: { operation: 'add', a: 0, b: 0 },
  handles: {
    inputs: [
      { id: 'a', type: FlowDataType.NUMBER },
      { id: 'b', type: FlowDataType.NUMBER },
    ],
    outputs: [{ id: 'result', type: FlowDataType.NUMBER }],
  },
};
const getPromptNodeDefinition: BaseNodeDefinition<GetPromptNodeData> = {
  type: 'getPromptNode',
  label: 'Get Prompt',
  category: 'Utility',
  dataSchema: GetPromptNodeDataSchema,
  initialData: { promptName: '' },
  handles: {
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.STRING }],
  },
};
const setVariableNodeDefinition: BaseNodeDefinition<SetVariableNodeData> = {
  type: 'setVariableNode',
  label: 'Set Variable',
  category: 'Utility',
  dataSchema: SetVariableNodeDataSchema,
  initialData: { variableName: 'myVar', scope: 'Execution' },
  handles: {
    inputs: [{ id: 'value', type: FlowDataType.ANY }],
    outputs: [{ id: 'value', type: FlowDataType.ANY }],
  },
};
const getVariableNodeDefinition: BaseNodeDefinition<GetVariableNodeData> = {
  type: 'getVariableNode',
  label: 'Get Variable',
  category: 'Utility',
  dataSchema: GetVariableNodeDataSchema,
  initialData: { variableName: 'myVar', scope: 'Execution' },
  handles: {
    inputs: [],
    outputs: [{ id: 'value', type: FlowDataType.ANY }],
  },
};

const regexNodeDefinition: BaseNodeDefinition<RegexNodeData> = {
  type: 'regexNode',
  label: 'Regex',
  category: 'Utility',
  dataSchema: RegexNodeDataSchema,
  initialData: { mode: 'sillytavern' },
  handles: {
    inputs: [{ id: 'string', type: FlowDataType.STRING }],
    outputs: [
      { id: 'result', type: FlowDataType.STRING },
      { id: 'matches', type: FlowDataType.OBJECT },
    ],
  },
};

const runSlashCommandNodeDefinition: BaseNodeDefinition<RunSlashCommandNodeData> = {
  type: 'runSlashCommandNode',
  label: 'Run Slash Command',
  category: 'Utility',
  dataSchema: RunSlashCommandNodeDataSchema,
  initialData: { command: '' },
  handles: {
    inputs: [{ id: 'command', type: FlowDataType.STRING }],
    outputs: [{ id: 'result', type: FlowDataType.STRING }],
  },
};

const typeConverterNodeDefinition: BaseNodeDefinition<TypeConverterNodeData> = {
  type: 'typeConverterNode',
  label: 'Type Converter',
  category: 'Utility',
  dataSchema: TypeConverterNodeDataSchema,
  initialData: { targetType: 'string' },
  handles: {
    inputs: [{ id: 'value', type: FlowDataType.ANY }],
    outputs: [{ id: 'result', type: FlowDataType.ANY }],
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'output' && handleId === 'result') {
      const data = node.data as TypeConverterNodeData;
      switch (data.targetType) {
        case 'string':
          return FlowDataType.STRING;
        case 'number':
          return FlowDataType.NUMBER;
        case 'object':
        case 'array':
          return FlowDataType.OBJECT; // Both are objects in JS
        default:
          return FlowDataType.ANY;
      }
    }
    return undefined;
  },
};

export const baseNodeDefinitions: BaseNodeDefinition[] = [
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
  getChatMessageNodeDefinition,
  editChatMessageNodeDefinition,
  sendChatMessageNodeDefinition,
  removeChatMessageNodeDefinition,
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
  dateTimeNodeDefinition,
  randomNodeDefinition,
  stringToolsNodeDefinition,
  mathNodeDefinition,
  getPromptNodeDefinition,
  setVariableNodeDefinition,
  getVariableNodeDefinition,
  regexNodeDefinition,
  runSlashCommandNodeDefinition,
  typeConverterNodeDefinition,
];

export const nodeDefinitionMap = new Map<string, BaseNodeDefinition>(baseNodeDefinitions.map((def) => [def.type, def]));

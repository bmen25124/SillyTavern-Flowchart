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
  PickCharacterNodeData,
  PickCharacterNodeDataSchema,
  PickLorebookNodeData,
  PickLorebookNodeDataSchema,
  PickPromptNodeData,
  PickPromptNodeDataSchema,
  PickMathOperationNodeData,
  PickMathOperationNodeDataSchema,
  PickStringToolsOperationNodeData,
  PickStringToolsOperationNodeDataSchema,
  PickPromptEngineeringModeNodeData,
  PickPromptEngineeringModeNodeDataSchema,
  PickRandomModeNodeData,
  PickRandomModeNodeDataSchema,
  PickRegexModeNodeData,
  PickRegexModeNodeDataSchema,
  PickTypeConverterTargetNodeData,
  PickTypeConverterTargetNodeDataSchema,
  PickRegexScriptNodeData,
  PickRegexScriptNodeDataSchema,
  FieldDefinition,
  JsonNodeItem,
} from '../../../flow-types.js';
import { BaseNodeDefinition } from './types.js';
import { EventNames } from 'sillytavern-utils-lib/types';
import { PromptEngineeringMode } from '../../../config.js';
import { z } from 'zod';
import { ChatMessageSchema, WIEntryListSchema, WIEntrySchema } from '../../../schemas.js';
import { Node, Edge } from '@xyflow/react';

const MERGE_MESSAGES_HANDLE_PREFIX = 'messages_';
const MERGE_OBJECTS_HANDLE_PREFIX = 'object_';
const STRING_TOOLS_MERGE_HANDLE_PREFIX = 'string_';

function zodTypeToFlowType(type: z.ZodType): FlowDataType {
  if (type instanceof z.ZodNumber) return FlowDataType.NUMBER;
  if (type instanceof z.ZodString) return FlowDataType.STRING;
  if (type instanceof z.ZodBoolean) return FlowDataType.BOOLEAN;
  return FlowDataType.ANY;
}

function buildZodSchemaFromFields(fields: FieldDefinition[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.name] = buildZodSchema(field);
  }
  return z.object(shape);
}

function buildZodSchema(definition: FieldDefinition): z.ZodTypeAny {
  let zodType: z.ZodTypeAny;
  switch (definition.type) {
    case 'string':
      zodType = z.string();
      break;
    case 'number':
      zodType = z.number();
      break;
    case 'boolean':
      zodType = z.boolean();
      break;
    case 'enum':
      zodType = z.enum(definition.values as [string, ...string[]]);
      break;
    case 'object':
      zodType = buildZodSchemaFromFields(definition.fields || []);
      break;
    case 'array':
      zodType = z.array(definition.items ? buildZodSchema(definition.items as FieldDefinition) : z.any());
      break;
    default:
      zodType = z.any();
  }
  if (definition.description) {
    return zodType.describe(definition.description);
  }
  return zodType;
}

function jsonItemToZod(item: JsonNodeItem): z.ZodType {
  switch (item.type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'array':
      const firstItem = (item.value as JsonNodeItem[])?.[0];
      return z.array(firstItem ? jsonItemToZod(firstItem) : z.any());
    case 'object':
      const shape: Record<string, z.ZodType> = {};
      (item.value as JsonNodeItem[]).forEach((child) => {
        shape[child.key] = jsonItemToZod(child);
      });
      return z.object(shape);
    default:
      return z.any();
  }
}

function inferSchemaFromJsonNode(data: JsonNodeData): z.ZodType {
  if (data.rootType === 'array') {
    const firstItem = data.items?.[0];
    return z.array(firstItem ? jsonItemToZod(firstItem) : z.any());
  }
  const shape: Record<string, z.ZodType> = {};
  data.items.forEach((item) => {
    shape[item.key] = jsonItemToZod(item);
  });
  return z.object(shape);
}

// Define reusable schemas
const CharacterDataSchema = z.object({
  name: z.string().describe("The character's name."),
  avatar: z.string().describe("The character's avatar filename."),
  description: z.string().describe("The character's description."),
  first_mes: z.string().describe("The character's first message."),
  scenario: z.string().describe('The scenario.'),
  personality: z.string().describe("The character's personality."),
  mes_example: z.string().describe('Example messages.'),
  tags: z.array(z.string()).describe('A list of tags.'),
});

const getCharacterNodeDefinition: BaseNodeDefinition<GetCharacterNodeData> = {
  type: 'getCharacterNode',
  label: 'Get Character',
  category: 'Character',
  dataSchema: GetCharacterNodeDataSchema,
  currentVersion: 1,
  initialData: { characterAvatar: '', _version: 1 },
  handles: {
    inputs: [{ id: 'characterAvatar', type: FlowDataType.STRING }],
    outputs: [
      { id: 'result', type: FlowDataType.OBJECT, schema: CharacterDataSchema },
      { id: 'name', type: FlowDataType.STRING },
      { id: 'description', type: FlowDataType.STRING },
      { id: 'first_mes', type: FlowDataType.STRING },
      { id: 'scenario', type: FlowDataType.STRING },
      { id: 'personality', type: FlowDataType.STRING },
      { id: 'mes_example', type: FlowDataType.STRING },
      { id: 'tags', type: FlowDataType.OBJECT, schema: z.array(z.string()) },
    ],
  },
};
const createCharacterNodeDefinition: BaseNodeDefinition<CreateCharacterNodeData> = {
  type: 'createCharacterNode',
  label: 'Create Character',
  category: 'Character',
  dataSchema: CreateCharacterNodeDataSchema,
  currentVersion: 1,
  initialData: { name: 'New Character', _version: 1 },
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
  currentVersion: 1,
  initialData: { characterAvatar: '', _version: 1 },
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

const triggerNodeDefinition: BaseNodeDefinition<TriggerNodeData> = {
  type: 'triggerNode',
  label: 'Event Trigger',
  category: 'Trigger',
  dataSchema: TriggerNodeDataSchema,
  currentVersion: 1,
  initialData: { selectedEventType: EventNames.USER_MESSAGE_RENDERED, _version: 1 },
  handles: { inputs: [], outputs: [] },
  getDynamicHandles: (node, _allNodes, _allEdges) => {
    const { data } = node;
    const eventParams = EventNameParameters[data.selectedEventType];
    if (!eventParams) return { inputs: [], outputs: [] };
    const outputs = Object.keys(eventParams).map((paramName) => ({
      id: paramName,
      type: zodTypeToFlowType(eventParams[paramName]),
      schema: eventParams[paramName],
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
  currentVersion: 1,
  initialData: { payload: '{\n}', _version: 1 },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.OBJECT }] },
};

const stringNodeDefinition: BaseNodeDefinition<StringNodeData> = {
  type: 'stringNode',
  label: 'String',
  category: 'Input',
  dataSchema: StringNodeDataSchema,
  currentVersion: 1,
  initialData: { value: 'hello', _version: 1 },
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
  currentVersion: 1,
  initialData: { value: 123, _version: 1 },
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
  currentVersion: 1,
  initialData: { profileId: '', _version: 1 },
  handles: {
    inputs: [{ id: null, type: FlowDataType.ANY }],
    outputs: [{ id: null, type: FlowDataType.PROFILE_ID }],
  },
};

const jsonNodeDefinition: BaseNodeDefinition<JsonNodeData> = {
  type: 'jsonNode',
  label: 'JSON',
  category: 'JSON',
  dataSchema: JsonNodeDataSchema,
  currentVersion: 1,
  initialData: { items: [], rootType: 'object', _version: 1 },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.OBJECT }] },
  getDynamicHandles: (node, _allNodes, _allEdges) => {
    return {
      inputs: [],
      outputs: [{ id: null, type: FlowDataType.OBJECT, schema: inferSchemaFromJsonNode(node.data) }],
    };
  },
};
const schemaNodeDefinition: BaseNodeDefinition<SchemaNodeData> = {
  type: 'schemaNode',
  label: 'Schema',
  category: 'JSON',
  dataSchema: SchemaNodeDataSchema,
  currentVersion: 1,
  initialData: { fields: [], _version: 1 },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.SCHEMA }] },
};

const ifNodeDefinition: BaseNodeDefinition<IfNodeData> = {
  type: 'ifNode',
  label: 'If',
  category: 'Logic',
  dataSchema: IfNodeDataSchema,
  currentVersion: 1,
  initialData: { conditions: [{ id: crypto.randomUUID(), code: 'return true;' }], _version: 1 },
  handles: {
    inputs: [{ id: null, type: FlowDataType.ANY }],
    outputs: [{ id: 'false', type: FlowDataType.ANY }],
  },
  getDynamicHandles: (node, _allNodes, _allEdges) => ({
    inputs: [],
    outputs: node.data.conditions.map((c) => ({ id: c.id, type: FlowDataType.ANY })),
  }),
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'output') {
      const isConditionHandle = (node.data as IfNodeData).conditions.some((c) => c.id === handleId);
      if (handleId === 'false' || isConditionHandle) return FlowDataType.ANY;
    }
    return undefined;
  },
};

const createLorebookNodeDefinition: BaseNodeDefinition<CreateLorebookNodeData> = {
  type: 'createLorebookNode',
  label: 'Create Lorebook',
  category: 'Lorebook',
  dataSchema: CreateLorebookNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: 'My Lorebook', _version: 1 },
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
  currentVersion: 1,
  initialData: { worldName: '', key: '', content: '', comment: '', _version: 1 },
  handles: {
    inputs: [
      { id: 'worldName', type: FlowDataType.STRING },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
    ],
    outputs: [{ id: null, type: FlowDataType.OBJECT, schema: WIEntrySchema }],
  },
};
const editLorebookEntryNodeDefinition: BaseNodeDefinition<EditLorebookEntryNodeData> = {
  type: 'editLorebookEntryNode',
  label: 'Edit Lorebook Entry',
  category: 'Lorebook',
  dataSchema: EditLorebookEntryNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: '', entryUid: undefined, _version: 1 },
  handles: {
    inputs: [
      { id: 'worldName', type: FlowDataType.STRING },
      { id: 'entryUid', type: FlowDataType.NUMBER },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
    ],
    outputs: [{ id: null, type: FlowDataType.OBJECT, schema: WIEntrySchema }],
  },
};
const getLorebookNodeDefinition: BaseNodeDefinition<GetLorebookNodeData> = {
  type: 'getLorebookNode',
  label: 'Get Lorebook',
  category: 'Lorebook',
  dataSchema: GetLorebookNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: '', _version: 1 },
  handles: {
    inputs: [{ id: 'worldName', type: FlowDataType.STRING }],
    outputs: [{ id: 'entries', type: FlowDataType.OBJECT, schema: WIEntryListSchema }],
  },
};
const getLorebookEntryNodeDefinition: BaseNodeDefinition<GetLorebookEntryNodeData> = {
  type: 'getLorebookEntryNode',
  label: 'Get Lorebook Entry',
  category: 'Lorebook',
  dataSchema: GetLorebookEntryNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: '', entryUid: undefined, _version: 1 },
  handles: {
    inputs: [
      { id: 'worldName', type: FlowDataType.STRING },
      { id: 'entryUid', type: FlowDataType.NUMBER },
    ],
    outputs: [
      { id: 'entry', type: FlowDataType.OBJECT, schema: WIEntrySchema },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
    ],
  },
};

const createMessagesNodeDefinition: BaseNodeDefinition<CreateMessagesNodeData> = {
  type: 'createMessagesNode',
  label: 'Create Messages',
  category: 'API Request',
  dataSchema: CreateMessagesNodeDataSchema,
  currentVersion: 1,
  initialData: { profileId: '', _version: 1 },
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
  currentVersion: 1,
  initialData: {
    messages: [{ id: crypto.randomUUID(), role: 'system', content: 'You are a helpful assistant.' }],
    _version: 1,
  },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.MESSAGES }] },
  getDynamicHandles: (node, _allNodes, _allEdges) => ({
    inputs: node.data.messages.flatMap((m) => [
      { id: m.id, type: FlowDataType.STRING },
      { id: `${m.id}_role`, type: FlowDataType.STRING },
    ]),
    outputs: [],
  }),
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'input' && handleId) {
      const isRoleHandle = handleId.endsWith('_role');
      const msgId = isRoleHandle ? handleId.slice(0, -5) : handleId;
      if ((node.data as CustomMessageNodeData).messages.some((m) => m.id === msgId)) return FlowDataType.STRING;
    }
    return undefined;
  },
};
const mergeMessagesNodeDefinition: BaseNodeDefinition<MergeMessagesNodeData> = {
  type: 'mergeMessagesNode',
  label: 'Merge Messages',
  category: 'API Request',
  dataSchema: MergeMessagesNodeDataSchema,
  currentVersion: 1,
  initialData: { inputCount: 2, _version: 1 },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.MESSAGES }] },
  getDynamicHandleId: (index: number) => `${MERGE_MESSAGES_HANDLE_PREFIX}${index}`,
  isDynamicHandle: (handleId: string | null) => handleId?.startsWith(MERGE_MESSAGES_HANDLE_PREFIX) ?? false,
  getDynamicHandles: (node, _allNodes, _allEdges) => {
    const inputs = [];
    for (let i = 0; i < node.data.inputCount; i++) {
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
  currentVersion: 1,
  initialData: {
    profileId: '',
    schemaName: 'mySchema',
    promptEngineeringMode: PromptEngineeringMode.NATIVE,
    maxResponseToken: 1000,
    _version: 1,
  },
  handles: {
    inputs: [
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
      { id: 'messages', type: FlowDataType.MESSAGES },
      { id: 'schema', type: FlowDataType.SCHEMA },
      { id: 'maxResponseToken', type: FlowDataType.NUMBER },
      { id: 'promptEngineeringMode', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'result', type: FlowDataType.STRUCTURED_RESULT }],
  },
  getDynamicHandles: (node, allNodes: Node[], allEdges: Edge[]) => {
    const schemaEdge = allEdges.find((edge) => edge.target === node.id && edge.targetHandle === 'schema');
    if (!schemaEdge) {
      return { inputs: [], outputs: [] };
    }

    const schemaNode = allNodes.find((n) => n.id === schemaEdge.source);
    if (schemaNode?.type !== 'schemaNode' || !Array.isArray(schemaNode.data.fields)) {
      return { inputs: [], outputs: [] };
    }

    const schema = buildZodSchemaFromFields(schemaNode.data.fields);

    // The main result object, now with its schema defined.
    const resultHandle = { id: 'result', type: FlowDataType.STRUCTURED_RESULT, schema };

    // Individual handles for each field in the schema.
    const fieldHandles = (schemaNode.data.fields as FieldDefinition[]).map((field) => ({
      id: field.name,
      type: zodTypeToFlowType(buildZodSchema(field)),
      schema: buildZodSchema(field),
    }));

    // Return both the main result and the destructured fields.
    return { inputs: [], outputs: [resultHandle, ...fieldHandles] };
  },
  getHandleType: ({ handleId, handleDirection, node, nodes, edges }) => {
    if (handleDirection !== 'output') {
      return undefined;
    }

    // The 'result' handle is static and always valid. Its schema is inferred dynamically.
    if (handleId === 'result') {
      return FlowDataType.STRUCTURED_RESULT;
    }

    // For any other (dynamic) handle, we must have a valid connected schema.
    const schemaEdge = edges.find((edge) => edge.target === node.id && edge.targetHandle === 'schema');
    if (!schemaEdge) {
      // A dynamic handle was requested, but no schema is connected.
      return undefined;
    }

    const schemaNode = nodes.find((n) => n.id === schemaEdge.source);
    if (schemaNode?.type !== 'schemaNode' || !Array.isArray(schemaNode.data.fields)) {
      // The connected node is not a valid schema node.
      return undefined;
    }

    const field = schemaNode.data.fields.find((f: any) => f.name === handleId);
    if (!field) {
      // The handle ID does not match any field in the connected schema.
      return undefined;
    }

    return zodTypeToFlowType(buildZodSchema(field));
  },
};
const getChatMessageNodeDefinition: BaseNodeDefinition<GetChatMessageNodeData> = {
  type: 'getChatMessageNode',
  label: 'Get Chat Message',
  category: 'Chat',
  dataSchema: GetChatMessageNodeDataSchema,
  currentVersion: 1,
  initialData: { messageId: 'last', _version: 1 },
  handles: {
    inputs: [{ id: 'messageId', type: FlowDataType.ANY }],
    outputs: [
      { id: 'id', type: FlowDataType.NUMBER },
      { id: 'result', type: FlowDataType.OBJECT, schema: ChatMessageSchema },
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
  currentVersion: 1,
  initialData: { message: '', _version: 1 },
  handles: {
    inputs: [
      { id: 'messageId', type: FlowDataType.NUMBER },
      { id: 'message', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'messageObject', type: FlowDataType.OBJECT, schema: ChatMessageSchema }],
  },
};
const sendChatMessageNodeDefinition: BaseNodeDefinition<SendChatMessageNodeData> = {
  type: 'sendChatMessageNode',
  label: 'Send Chat Message',
  category: 'Chat',
  dataSchema: SendChatMessageNodeDataSchema,
  currentVersion: 1,
  initialData: { message: '', role: 'assistant', _version: 1 },
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
  currentVersion: 1,
  initialData: { _version: 1 },
  handles: {
    inputs: [{ id: 'messageId', type: FlowDataType.NUMBER }],
    outputs: [],
  },
};

const logNodeDefinition: BaseNodeDefinition<LogNodeData> = {
  type: 'logNode',
  label: 'Log',
  category: 'Utility',
  dataSchema: LogNodeDataSchema,
  currentVersion: 1,
  initialData: { prefix: 'Log:', _version: 1 },
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
  currentVersion: 1,
  initialData: { template: 'Hello, {{name}}!', _version: 1 },
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
  currentVersion: 1,
  initialData: { inputCount: 2, _version: 1 },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.OBJECT }] },
  getDynamicHandleId: (index: number) => `${MERGE_OBJECTS_HANDLE_PREFIX}${index}`,
  isDynamicHandle: (handleId: string | null) => handleId?.startsWith(MERGE_OBJECTS_HANDLE_PREFIX) ?? false,
  getDynamicHandles: (node, _allNodes, _allEdges) => {
    const inputs = [];
    for (let i = 0; i < node.data.inputCount; i++) {
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
  currentVersion: 1,
  initialData: { label: 'Group', _version: 1 },
  handles: { inputs: [], outputs: [] },
};
const executeJsNodeDefinition: BaseNodeDefinition<ExecuteJsNodeData> = {
  type: 'executeJsNode',
  label: 'Execute JS Code',
  category: 'Utility',
  dataSchema: ExecuteJsNodeDataSchema,
  currentVersion: 1,
  initialData: { code: 'return input;', _version: 1 },
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
  currentVersion: 1,
  initialData: { _version: 1 },
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
  currentVersion: 1,
  initialData: { mode: 'number', min: 0, max: 100, _version: 1 },
  handles: {
    inputs: [
      { id: 'mode', type: FlowDataType.STRING },
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
  currentVersion: 1,
  initialData: { operation: 'merge', inputCount: 2, delimiter: '', _version: 1 },
  handles: {
    inputs: [
      { id: 'operation', type: FlowDataType.STRING },
      { id: 'delimiter', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'result', type: FlowDataType.ANY }],
  },
  getDynamicHandleId: (index: number) => `${STRING_TOOLS_MERGE_HANDLE_PREFIX}${index}`,
  isDynamicHandle: (handleId: string | null) => handleId?.startsWith(STRING_TOOLS_MERGE_HANDLE_PREFIX) ?? false,
  getDynamicHandles: (node, _allNodes, _allEdges) => {
    const { data } = node;
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
  currentVersion: 1,
  initialData: { operation: 'add', a: 0, b: 0, _version: 1 },
  handles: {
    inputs: [
      { id: 'operation', type: FlowDataType.STRING },
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
  currentVersion: 1,
  initialData: { promptName: '', _version: 1 },
  handles: {
    inputs: [{ id: 'promptName', type: FlowDataType.STRING }],
    outputs: [{ id: null, type: FlowDataType.STRING }],
  },
};
const setVariableNodeDefinition: BaseNodeDefinition<SetVariableNodeData> = {
  type: 'setVariableNode',
  label: 'Set Variable',
  category: 'Utility',
  dataSchema: SetVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'myVar', _version: 1 },
  handles: {
    inputs: [
      { id: 'value', type: FlowDataType.ANY },
      { id: 'variableName', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'value', type: FlowDataType.ANY }],
  },
};
const getVariableNodeDefinition: BaseNodeDefinition<GetVariableNodeData> = {
  type: 'getVariableNode',
  label: 'Get Variable',
  category: 'Utility',
  dataSchema: GetVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'myVar', _version: 1 },
  handles: {
    inputs: [{ id: 'variableName', type: FlowDataType.STRING }],
    outputs: [{ id: 'value', type: FlowDataType.ANY }],
  },
};

const regexNodeDefinition: BaseNodeDefinition<RegexNodeData> = {
  type: 'regexNode',
  label: 'Regex',
  category: 'Utility',
  dataSchema: RegexNodeDataSchema,
  currentVersion: 1,
  initialData: { mode: 'sillytavern', findRegex: '', replaceString: '', scriptId: '', _version: 1 },
  handles: {
    inputs: [
      { id: 'string', type: FlowDataType.STRING },
      { id: 'mode', type: FlowDataType.STRING },
      { id: 'scriptId', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'result', type: FlowDataType.STRING },
      { id: 'matches', type: FlowDataType.OBJECT, schema: z.array(z.string()) },
    ],
  },
};

const runSlashCommandNodeDefinition: BaseNodeDefinition<RunSlashCommandNodeData> = {
  type: 'runSlashCommandNode',
  label: 'Run Slash Command',
  category: 'Utility',
  dataSchema: RunSlashCommandNodeDataSchema,
  currentVersion: 1,
  initialData: { command: '', _version: 1 },
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
  currentVersion: 1,
  initialData: { targetType: 'string', _version: 1 },
  handles: {
    inputs: [
      { id: 'value', type: FlowDataType.ANY },
      { id: 'targetType', type: FlowDataType.STRING },
    ],
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

// Picker Nodes
const pickCharacterNodeDefinition: BaseNodeDefinition<PickCharacterNodeData> = {
  type: 'pickCharacterNode',
  label: 'Pick Character',
  category: 'Picker',
  dataSchema: PickCharacterNodeDataSchema,
  currentVersion: 1,
  initialData: { characterAvatar: '', _version: 1 },
  handles: { inputs: [], outputs: [{ id: 'avatar', type: FlowDataType.STRING }] },
};
const pickLorebookNodeDefinition: BaseNodeDefinition<PickLorebookNodeData> = {
  type: 'pickLorebookNode',
  label: 'Pick Lorebook',
  category: 'Picker',
  dataSchema: PickLorebookNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: '', _version: 1 },
  handles: { inputs: [], outputs: [{ id: 'name', type: FlowDataType.STRING }] },
};
const pickPromptNodeDefinition: BaseNodeDefinition<PickPromptNodeData> = {
  type: 'pickPromptNode',
  label: 'Pick Prompt',
  category: 'Picker',
  dataSchema: PickPromptNodeDataSchema,
  currentVersion: 1,
  initialData: { promptName: '', _version: 1 },
  handles: { inputs: [], outputs: [{ id: 'name', type: FlowDataType.STRING }] },
};
const pickRegexScriptNodeDefinition: BaseNodeDefinition<PickRegexScriptNodeData> = {
  type: 'pickRegexScriptNode',
  label: 'Pick Regex Script',
  category: 'Picker',
  dataSchema: PickRegexScriptNodeDataSchema,
  currentVersion: 1,
  initialData: { scriptId: '', _version: 1 },
  handles: { inputs: [], outputs: [{ id: 'id', type: FlowDataType.STRING }] },
};
const pickMathOperationNodeDefinition: BaseNodeDefinition<PickMathOperationNodeData> = {
  type: 'pickMathOperationNode',
  label: 'Pick Math Operation',
  category: 'Picker',
  dataSchema: PickMathOperationNodeDataSchema,
  currentVersion: 1,
  initialData: { operation: 'add', _version: 1 },
  handles: { inputs: [], outputs: [{ id: 'operation', type: FlowDataType.STRING }] },
};
const pickStringToolsOperationNodeDefinition: BaseNodeDefinition<PickStringToolsOperationNodeData> = {
  type: 'pickStringToolsOperationNode',
  label: 'Pick String Operation',
  category: 'Picker',
  dataSchema: PickStringToolsOperationNodeDataSchema,
  currentVersion: 1,
  initialData: { operation: 'merge', _version: 1 },
  handles: { inputs: [], outputs: [{ id: 'operation', type: FlowDataType.STRING }] },
};
const pickPromptEngineeringModeNodeDefinition: BaseNodeDefinition<PickPromptEngineeringModeNodeData> = {
  type: 'pickPromptEngineeringModeNode',
  label: 'Pick Prompt Mode',
  category: 'Picker',
  dataSchema: PickPromptEngineeringModeNodeDataSchema,
  currentVersion: 1,
  initialData: { mode: PromptEngineeringMode.NATIVE, _version: 1 },
  handles: { inputs: [], outputs: [{ id: 'mode', type: FlowDataType.STRING }] },
};
const pickRandomModeNodeDefinition: BaseNodeDefinition<PickRandomModeNodeData> = {
  type: 'pickRandomModeNode',
  label: 'Pick Random Mode',
  category: 'Picker',
  dataSchema: PickRandomModeNodeDataSchema,
  currentVersion: 1,
  initialData: { mode: 'number', _version: 1 },
  handles: { inputs: [], outputs: [{ id: 'mode', type: FlowDataType.STRING }] },
};
const pickRegexModeNodeDefinition: BaseNodeDefinition<PickRegexModeNodeData> = {
  type: 'pickRegexModeNode',
  label: 'Pick Regex Mode',
  category: 'Picker',
  dataSchema: PickRegexModeNodeDataSchema,
  currentVersion: 1,
  initialData: { mode: 'sillytavern', _version: 1 },
  handles: { inputs: [], outputs: [{ id: 'mode', type: FlowDataType.STRING }] },
};
const pickTypeConverterTargetNodeDefinition: BaseNodeDefinition<PickTypeConverterTargetNodeData> = {
  type: 'pickTypeConverterTargetNode',
  label: 'Pick Conversion Type',
  category: 'Picker',
  dataSchema: PickTypeConverterTargetNodeDataSchema,
  currentVersion: 1,
  initialData: { targetType: 'string', _version: 1 },
  handles: { inputs: [], outputs: [{ id: 'type', type: FlowDataType.STRING }] },
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
  pickCharacterNodeDefinition,
  pickLorebookNodeDefinition,
  pickPromptNodeDefinition,
  pickRegexScriptNodeDefinition,
  pickMathOperationNodeDefinition,
  pickStringToolsOperationNodeDefinition,
  pickPromptEngineeringModeNodeDefinition,
  pickRandomModeNodeDefinition,
  pickRegexModeNodeDefinition,
  pickTypeConverterTargetNodeDefinition,
];

export const nodeDefinitionMap = new Map<string, BaseNodeDefinition>(baseNodeDefinitions.map((def) => [def.type, def]));

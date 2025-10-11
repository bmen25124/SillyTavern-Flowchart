import { z } from 'zod';
import { EventNames } from 'sillytavern-utils-lib/types';
import { Connection, Edge, Node } from '@xyflow/react';

// These parameters are ordered method parameters.
// For example, `{ messageId: z.number() }` means, `function (messageId: number)`
// @ts-ignore For now no need to add others
export const EventNameParameters: Record<string, Record<string, z.ZodType>> = {
  [EventNames.USER_MESSAGE_RENDERED]: { messageId: z.number() },
  [EventNames.CHARACTER_MESSAGE_RENDERED]: { messageId: z.number() },
};

export enum FlowDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  PROFILE_ID = 'profileId',
  MESSAGES = 'messages',
  SCHEMA = 'schema',
  STRUCTURED_RESULT = 'structuredResult',
  ANY = 'any',
}

export type HandleSpec = {
  id: string | null;
  type: FlowDataType;
};

export const NodeHandleTypes: Record<string, { inputs: HandleSpec[]; outputs: HandleSpec[] }> = {
  triggerNode: {
    inputs: [],
    outputs: [],
  },
  manualTriggerNode: {
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.OBJECT }],
  },
  ifNode: {
    inputs: [],
    // Outputs are for control flow. The runner doesn't pass data from them.
    // We will treat them as ANY to allow connection. The true source of data for the
    // next node will be a predecessor of the ifNode.
    outputs: [{ id: 'false', type: FlowDataType.ANY }], // + dynamic condition handles
  },
  createMessagesNode: {
    inputs: [
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
      { id: 'lastMessageId', type: FlowDataType.NUMBER },
    ],
    outputs: [{ id: null, type: FlowDataType.MESSAGES }],
  },
  customMessageNode: {
    inputs: [
      // Dynamic handles for each message content are checked separately in `checkConnectionValidity`
    ],
    outputs: [{ id: null, type: FlowDataType.MESSAGES }],
  },
  mergeMessagesNode: {
    inputs: [
      // Dynamic handles are checked separately in `checkConnectionValidity`
    ],
    outputs: [{ id: null, type: FlowDataType.MESSAGES }],
  },
  mergeObjectsNode: {
    inputs: [
      // Dynamic handles are checked separately in `checkConnectionValidity`
    ],
    outputs: [{ id: null, type: FlowDataType.OBJECT }],
  },
  stringNode: {
    inputs: [{ id: null, type: FlowDataType.ANY }], // Currently unused input
    outputs: [{ id: null, type: FlowDataType.STRING }],
  },
  numberNode: {
    inputs: [{ id: null, type: FlowDataType.ANY }], // Currently unused input
    outputs: [{ id: null, type: FlowDataType.NUMBER }],
  },
  jsonNode: {
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.OBJECT }],
  },
  handlebarNode: {
    inputs: [
      { id: 'template', type: FlowDataType.STRING },
      { id: 'data', type: FlowDataType.OBJECT },
    ],
    outputs: [{ id: 'result', type: FlowDataType.STRING }],
  },
  getCharacterNode: {
    inputs: [{ id: 'characterAvatar', type: FlowDataType.STRING }],
    outputs: [
      { id: 'result', type: FlowDataType.OBJECT },
      { id: 'name', type: FlowDataType.STRING },
      { id: 'description', type: FlowDataType.STRING },
      { id: 'first_mes', type: FlowDataType.STRING },
      { id: 'scenario', type: FlowDataType.STRING },
      { id: 'personality', type: FlowDataType.STRING },
      { id: 'mes_example', type: FlowDataType.STRING },
      { id: 'tags', type: FlowDataType.OBJECT }, // It's a string[]
    ],
  },
  structuredRequestNode: {
    inputs: [
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
      { id: 'messages', type: FlowDataType.MESSAGES },
      { id: 'schema', type: FlowDataType.SCHEMA },
      { id: 'messageId', type: FlowDataType.NUMBER },
      { id: 'maxResponseToken', type: FlowDataType.NUMBER },
    ],
    // Output for the full object. Dynamic handles for fields are validated separately.
    outputs: [{ id: 'result', type: FlowDataType.STRUCTURED_RESULT }],
  },
  schemaNode: {
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.SCHEMA }],
  },
  profileIdNode: {
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.PROFILE_ID }],
  },
  createCharacterNode: {
    inputs: [
      { id: 'name', type: FlowDataType.STRING },
      { id: 'description', type: FlowDataType.STRING },
      { id: 'first_mes', type: FlowDataType.STRING },
      { id: 'scenario', type: FlowDataType.STRING },
      { id: 'personality', type: FlowDataType.STRING },
      { id: 'mes_example', type: FlowDataType.STRING },
      { id: 'tags', type: FlowDataType.STRING },
    ],
    outputs: [{ id: null, type: FlowDataType.STRING }], // Output character name
  },
  editCharacterNode: {
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
    outputs: [{ id: null, type: FlowDataType.STRING }], // Output character name
  },
};

export function checkConnectionValidity(connection: Edge | Connection, nodes: Node[], edges: Edge[]): boolean {
  const sourceNode = nodes.find((node) => node.id === connection.source);
  const targetNode = nodes.find((node) => node.id === connection.target);

  if (!sourceNode || !targetNode || !sourceNode.type || !targetNode.type) {
    return false;
  }

  const sourceHandleTypes = NodeHandleTypes[sourceNode.type]?.outputs;
  const targetHandleTypes = NodeHandleTypes[targetNode.type]?.inputs;

  if (!sourceHandleTypes || !targetHandleTypes) {
    return false;
  }

  let sourceHandleType: FlowDataType | undefined;
  if (sourceNode.type === 'structuredRequestNode') {
    if (connection.sourceHandle === 'result') {
      sourceHandleType = FlowDataType.STRUCTURED_RESULT;
    } else {
      const schemaEdge = edges.find((edge) => edge.target === sourceNode.id && edge.targetHandle === 'schema');
      if (schemaEdge) {
        const schemaNode = nodes.find((node) => node.id === schemaEdge.source);
        if (schemaNode && schemaNode.type === 'schemaNode' && schemaNode.data.fields) {
          // @ts-ignore
          const field = schemaNode.data.fields.find((f: any) => f.name === connection.sourceHandle);
          if (field) {
            switch (field.type) {
              case 'string':
                sourceHandleType = FlowDataType.STRING;
                break;
              case 'number':
                sourceHandleType = FlowDataType.NUMBER;
                break;
              case 'boolean':
                sourceHandleType = FlowDataType.BOOLEAN;
                break;
              default:
                sourceHandleType = FlowDataType.OBJECT; // for object, array, enum
            }
          }
        }
      }
      // If we can't determine type, let's be permissive.
      if (!sourceHandleType) sourceHandleType = FlowDataType.ANY;
    }
  } else if (sourceNode.type === 'ifNode') {
    // @ts-ignore
    const isConditionHandle = sourceNode.data?.conditions?.some((c: any) => c.id === connection.sourceHandle);
    if (connection.sourceHandle === 'false' || isConditionHandle) {
      sourceHandleType = FlowDataType.ANY;
    }
  } else {
    sourceHandleType = sourceHandleTypes.find((h) => h.id === connection.sourceHandle)?.type;
  }

  let targetHandleType = targetHandleTypes.find((h) => h.id === connection.targetHandle)?.type;
  if (
    !targetHandleType &&
    targetNode.type === 'mergeMessagesNode' &&
    connection.targetHandle?.startsWith('messages_')
  ) {
    targetHandleType = FlowDataType.MESSAGES;
  }
  if (!targetHandleType && targetNode.type === 'mergeObjectsNode' && connection.targetHandle?.startsWith('object_')) {
    targetHandleType = FlowDataType.OBJECT;
  }
  if (!targetHandleType && targetNode.type === 'customMessageNode') {
    // any handle on customMessageNode is for a string content
    targetHandleType = FlowDataType.STRING;
  }

  if (!sourceHandleType || !targetHandleType) {
    return false;
  }

  // Permissive connections
  if (sourceHandleType === FlowDataType.ANY || targetHandleType === FlowDataType.ANY) {
    return true;
  }
  if (targetHandleType === FlowDataType.PROFILE_ID && sourceHandleType === FlowDataType.STRING) {
    return true;
  }
  if (targetHandleType === FlowDataType.STRING && sourceHandleType === FlowDataType.PROFILE_ID) {
    return true;
  }
  if (targetHandleType === FlowDataType.STRING && sourceHandleType !== FlowDataType.STRING) {
    return true; // Allow any type to be coerced to string
  }
  if (targetHandleType === FlowDataType.OBJECT && sourceHandleType !== FlowDataType.OBJECT) {
    return true; // Allow any type to be part of an object
  }

  return sourceHandleType === targetHandleType;
}

export const TriggerNodeDataSchema = z.object({
  selectedEventType: z.string().refine((val) => Object.values(EventNames).includes(val as any), {
    message: 'Invalid event type',
  }),
});
export type TriggerNodeData = z.infer<typeof TriggerNodeDataSchema>;

export const ManualTriggerNodeDataSchema = z.object({
  payload: z.string().default('{}'),
});
export type ManualTriggerNodeData = z.infer<typeof ManualTriggerNodeDataSchema>;

export const IfNodeDataSchema = z.object({
  conditions: z
    .array(z.object({ id: z.string(), code: z.string() }))
    .default([{ id: crypto.randomUUID(), code: 'return true;' }]),
});
export type IfNodeData = z.infer<typeof IfNodeDataSchema>;

export const CreateMessagesNodeDataSchema = z.object({
  profileId: z.string().optional(),
  lastMessageId: z.number().optional(),
});
export type CreateMessagesNodeData = z.infer<typeof CreateMessagesNodeDataSchema>;

export const CustomMessageNodeDataSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    }),
  ),
});
export type CustomMessageNodeData = z.infer<typeof CustomMessageNodeDataSchema>;

export const MergeMessagesNodeDataSchema = z.object({
  inputCount: z.number().min(1).default(2),
});
export type MergeMessagesNodeData = z.infer<typeof MergeMessagesNodeDataSchema>;

export const MergeObjectsNodeDataSchema = z.object({
  inputCount: z.number().min(1).default(2),
});
export type MergeObjectsNodeData = z.infer<typeof MergeObjectsNodeDataSchema>;

export const StringNodeDataSchema = z.object({
  value: z.string(),
});
export type StringNodeData = z.infer<typeof StringNodeDataSchema>;

export const NumberNodeDataSchema = z.object({
  value: z.number(),
});
export type NumberNodeData = z.infer<typeof NumberNodeDataSchema>;

export const StructuredRequestNodeDataSchema = z.object({
  profileId: z.string().optional(),
  schemaName: z.string().optional(),
  messageId: z.number().optional(),
  promptEngineeringMode: z.enum(['native', 'json', 'xml']),
  maxResponseToken: z.number().optional(),
});
export type StructuredRequestNodeData = z.infer<typeof StructuredRequestNodeDataSchema>;

// Recursive schema definitions for SchemaNode
export type FieldDefinition = {
  id: string;
  name: string;
} & SchemaTypeDefinition;

export type SchemaTypeDefinition = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum';
  description?: string;
  fields?: FieldDefinition[]; // For 'object'
  items?: SchemaTypeDefinition; // For 'array'
  values?: string[]; // For 'enum'
};

const SchemaTypeDefinitionSchema: z.ZodType<SchemaTypeDefinition> = z.lazy(() =>
  z.object({
    type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'enum']),
    description: z.string().optional(),
    fields: z.array(FieldDefinitionSchema).optional(),
    items: SchemaTypeDefinitionSchema.optional(),
    values: z.array(z.string()).optional(),
  }),
);

const FieldDefinitionSchema: z.ZodType<FieldDefinition> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'enum']),
    description: z.string().optional(),
    fields: z.array(FieldDefinitionSchema).optional(), // Recursive on itself for children
    items: SchemaTypeDefinitionSchema.optional(), // Recursive on the other type for array items
    values: z.array(z.string()).optional(),
  }),
);

export const SchemaNodeDataSchema = z.object({
  fields: z.array(FieldDefinitionSchema).default([]),
});
export type SchemaNodeData = z.infer<typeof SchemaNodeDataSchema>;

export const ProfileIdNodeDataSchema = z.object({
  profileId: z.string().optional(),
});
export type ProfileIdNodeData = z.infer<typeof ProfileIdNodeDataSchema>;

const CharacterFieldsSchema = {
  name: z.string().optional(),
  description: z.string().optional(),
  first_mes: z.string().optional(),
  scenario: z.string().optional(),
  personality: z.string().optional(),
  mes_example: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
};

export const CreateCharacterNodeDataSchema = z.object(CharacterFieldsSchema);
export type CreateCharacterNodeData = z.infer<typeof CreateCharacterNodeDataSchema>;

export const EditCharacterNodeDataSchema = z.object({
  ...CharacterFieldsSchema,
  characterAvatar: z.string().optional(),
});
export type EditCharacterNodeData = z.infer<typeof EditCharacterNodeDataSchema>;

export const GetCharacterNodeDataSchema = z.object({
  characterAvatar: z.string().optional(),
});
export type GetCharacterNodeData = z.infer<typeof GetCharacterNodeDataSchema>;

export const HandlebarNodeDataSchema = z.object({
  template: z.string().default('Hello, {{name}}!'),
});
export type HandlebarNodeData = z.infer<typeof HandlebarNodeDataSchema>;

// Recursive types for JsonNode
export type JsonValue = string | number | boolean | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export interface JsonArray extends Array<JsonValue> {}

export type JsonNodeItem = {
  id: string;
  key: string;
  value: JsonValue;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
};

export const JsonNodeDataSchema = z.object({
  items: z.array(z.any()).default([]), // Using any due to recursion complexity in Zod
});
export type JsonNodeData = {
  items: JsonNodeItem[];
};

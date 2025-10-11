import { z } from 'zod';
import { EventNames } from 'sillytavern-utils-lib/types';
import { Connection, Edge, Node } from '@xyflow/react';
import { nodeDefinitionMap } from './components/nodes/definitions/index.js';

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

export function checkConnectionValidity(connection: Edge | Connection, nodes: Node[], edges: Edge[]): boolean {
  const sourceNode = nodes.find((node) => node.id === connection.source);
  const targetNode = nodes.find((node) => node.id === connection.target);

  if (!sourceNode || !targetNode || !sourceNode.type || !targetNode.type) {
    return false;
  }
  if (sourceNode.type === 'triggerNode') return false;
  if (sourceNode.type === 'groupNode' || targetNode.type === 'groupNode') return false;

  const sourceDef = nodeDefinitionMap.get(sourceNode.type);
  const targetDef = nodeDefinitionMap.get(targetNode.type);

  if (!sourceDef || !targetDef) return false;

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
    sourceHandleType = sourceDef.handles.outputs.find((h) => h.id === connection.sourceHandle)?.type;
  }

  let targetHandleType = targetDef.handles.inputs.find((h) => h.id === connection.targetHandle)?.type;
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
    .min(1)
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

export const LogNodeDataSchema = z.object({
  prefix: z.string().default('Log:'),
});
export type LogNodeData = z.infer<typeof LogNodeDataSchema>;

export const StructuredRequestNodeDataSchema = z.object({
  profileId: z.string().optional(),
  schemaName: z.string().optional(),
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

export const CreateLorebookNodeDataSchema = z.object({
  worldName: z.string().optional(),
});
export type CreateLorebookNodeData = z.infer<typeof CreateLorebookNodeDataSchema>;

export const CreateLorebookEntryNodeDataSchema = z.object({
  worldName: z.string().optional(),
  key: z.string().optional(), // comma-separated
  content: z.string().optional(),
  comment: z.string().optional(),
});
export type CreateLorebookEntryNodeData = z.infer<typeof CreateLorebookEntryNodeDataSchema>;

export const EditLorebookEntryNodeDataSchema = z.object({
  worldName: z.string().optional(),
  entryUid: z.number().optional(), // uid is used as an identifier
  key: z.string().optional(),
  content: z.string().optional(),
  comment: z.string().optional(), // new comment
});
export type EditLorebookEntryNodeData = z.infer<typeof EditLorebookEntryNodeDataSchema>;

export const GroupNodeDataSchema = z.object({
  label: z.string().default('Group'),
});
export type GroupNodeData = z.infer<typeof GroupNodeDataSchema>;

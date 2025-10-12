import { z } from 'zod';
import { EventNames } from 'sillytavern-utils-lib/types';

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

// Recursive types and schema for JsonNode
const baseJsonNodeItemSchema = z.object({
  id: z.string(),
  key: z.string(), // Key is always present, but ignored for array children.
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
});

type JsonNodeItemPlain = z.infer<typeof baseJsonNodeItemSchema>;

export type JsonNodeItem = JsonNodeItemPlain & {
  value: string | number | boolean | JsonNodeItem[];
};

export const JsonNodeItemSchema: z.ZodType<JsonNodeItem> = baseJsonNodeItemSchema.extend({
  value: z.lazy(() => z.union([z.string(), z.number(), z.boolean(), z.array(JsonNodeItemSchema)])),
});

export const JsonNodeDataSchema = z.object({
  items: z.array(JsonNodeItemSchema).default([]),
});
export type JsonNodeData = z.infer<typeof JsonNodeDataSchema>;

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

export const GetLorebookNodeDataSchema = z.object({
  worldName: z.string().optional(),
});
export type GetLorebookNodeData = z.infer<typeof GetLorebookNodeDataSchema>;

export const GetLorebookEntryNodeDataSchema = z.object({
  worldName: z.string().optional(),
  entryUid: z.number().optional(),
});
export type GetLorebookEntryNodeData = z.infer<typeof GetLorebookEntryNodeDataSchema>;

export const GroupNodeDataSchema = z.object({
  label: z.string().default('Group'),
});
export type GroupNodeData = z.infer<typeof GroupNodeDataSchema>;

export const ExecuteJsNodeDataSchema = z.object({
  code: z.string().default('return input;'),
});
export type ExecuteJsNodeData = z.infer<typeof ExecuteJsNodeDataSchema>;

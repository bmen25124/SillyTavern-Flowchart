import { z } from 'zod';
import { EventNames } from 'sillytavern-utils-lib/types';
import { PromptEngineeringMode } from './config.js';

// These parameters are ordered method parameters.
// For example, `{ messageId: z.number() }` means, `function (messageId: number)`
// @ts-ignore For now no need to add others
export const EventNameParameters: Record<string, Record<string, z.ZodType>> = {
  [EventNames.USER_MESSAGE_RENDERED]: { messageId: z.number() },
  [EventNames.CHARACTER_MESSAGE_RENDERED]: { messageId: z.number() },
  [EventNames.MESSAGE_UPDATED]: { messageId: z.number() },
  [EventNames.CHAT_CHANGED]: {},
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
  promptEngineeringMode: z.nativeEnum(PromptEngineeringMode).optional(),
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
  rootType: z.enum(['object', 'array']).default('object'),
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

export const GetChatMessageNodeDataSchema = z.object({
  messageId: z.string().optional(), // Can be 'last', 'first', or a number
});
export type GetChatMessageNodeData = z.infer<typeof GetChatMessageNodeDataSchema>;

export const EditChatMessageNodeDataSchema = z.object({
  messageId: z.number().optional(),
  message: z.string().optional(),
});
export type EditChatMessageNodeData = z.infer<typeof EditChatMessageNodeDataSchema>;

export const SendChatMessageNodeDataSchema = z.object({
  message: z.string().default(''),
  role: z.enum(['user', 'assistant', 'system']).default('assistant'),
  name: z.string().optional(),
});
export type SendChatMessageNodeData = z.infer<typeof SendChatMessageNodeDataSchema>;

export const RemoveChatMessageNodeDataSchema = z.object({
  messageId: z.number().optional(),
});
export type RemoveChatMessageNodeData = z.infer<typeof RemoveChatMessageNodeDataSchema>;

export const DateTimeNodeDataSchema = z.object({
  format: z.string().optional(),
});
export type DateTimeNodeData = z.infer<typeof DateTimeNodeDataSchema>;

export const RandomNodeDataSchema = z.object({
  mode: z.enum(['number', 'array']).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});
export type RandomNodeData = z.infer<typeof RandomNodeDataSchema>;

export const StringToolsNodeDataSchema = z.object({
  operation: z.enum(['merge', 'split', 'join']).optional(),
  delimiter: z.string().optional(),
  inputCount: z.number().min(1).optional(),
});
export type StringToolsNodeData = z.infer<typeof StringToolsNodeDataSchema>;

export const MathNodeDataSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'modulo']).optional(),
  a: z.number().optional(),
  b: z.number().optional(),
});
export type MathNodeData = z.infer<typeof MathNodeDataSchema>;

export const GetPromptNodeDataSchema = z.object({
  promptName: z.string().optional(),
});
export type GetPromptNodeData = z.infer<typeof GetPromptNodeDataSchema>;

export const SetVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  scope: z.enum(['Execution', 'Session']).optional(),
});
export type SetVariableNodeData = z.infer<typeof SetVariableNodeDataSchema>;

export const GetVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  scope: z.enum(['Execution', 'Session']).optional(),
});
export type GetVariableNodeData = z.infer<typeof GetVariableNodeDataSchema>;

export const RegexNodeDataSchema = z.object({
  mode: z.enum(['sillytavern', 'custom']).optional(),
  scriptId: z.string().optional(),
  findRegex: z.string().optional(),
  replaceString: z.string().optional(),
});
export type RegexNodeData = z.infer<typeof RegexNodeDataSchema>;

export const RunSlashCommandNodeDataSchema = z.object({
  command: z.string().optional(),
});
export type RunSlashCommandNodeData = z.infer<typeof RunSlashCommandNodeDataSchema>;

export const TypeConverterNodeDataSchema = z.object({
  targetType: z.enum(['string', 'number', 'object', 'array']).optional(),
});
export type TypeConverterNodeData = z.infer<typeof TypeConverterNodeDataSchema>;

// Picker Node Schemas
export const PickCharacterNodeDataSchema = z.object({
  characterAvatar: z.string().default(''),
});
export type PickCharacterNodeData = z.infer<typeof PickCharacterNodeDataSchema>;

export const PickLorebookNodeDataSchema = z.object({
  worldName: z.string().default(''),
});
export type PickLorebookNodeData = z.infer<typeof PickLorebookNodeDataSchema>;

export const PickPromptNodeDataSchema = z.object({
  promptName: z.string().default(''),
});
export type PickPromptNodeData = z.infer<typeof PickPromptNodeDataSchema>;

export const PickMathOperationNodeDataSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'modulo']).default('add'),
});
export type PickMathOperationNodeData = z.infer<typeof PickMathOperationNodeDataSchema>;

export const PickStringToolsOperationNodeDataSchema = z.object({
  operation: z.enum(['merge', 'split', 'join']).default('merge'),
});
export type PickStringToolsOperationNodeData = z.infer<typeof PickStringToolsOperationNodeDataSchema>;

export const PickVariableScopeNodeDataSchema = z.object({
  scope: z.enum(['Execution', 'Session']).default('Execution'),
});
export type PickVariableScopeNodeData = z.infer<typeof PickVariableScopeNodeDataSchema>;

export const PickPromptEngineeringModeNodeDataSchema = z.object({
  mode: z.nativeEnum(PromptEngineeringMode).default(PromptEngineeringMode.NATIVE),
});
export type PickPromptEngineeringModeNodeData = z.infer<typeof PickPromptEngineeringModeNodeDataSchema>;

export const PickRandomModeNodeDataSchema = z.object({
  mode: z.enum(['number', 'array']).default('number'),
});
export type PickRandomModeNodeData = z.infer<typeof PickRandomModeNodeDataSchema>;

export const PickRegexModeNodeDataSchema = z.object({
  mode: z.enum(['sillytavern', 'custom']).default('sillytavern'),
});
export type PickRegexModeNodeData = z.infer<typeof PickRegexModeNodeDataSchema>;

export const PickTypeConverterTargetNodeDataSchema = z.object({
  targetType: z.enum(['string', 'number', 'object', 'array']).default('string'),
});
export type PickTypeConverterTargetNodeData = z.infer<typeof PickTypeConverterTargetNodeDataSchema>;

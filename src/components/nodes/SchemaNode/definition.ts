import { z } from 'zod';
import { Node } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { SchemaNode } from './SchemaNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { buildZodSchema } from '../../../utils/schema-builder.js';
import { WIEntrySchema, ChatMessageSchema } from '../../../schemas.js';

// A map of available pre-defined schemas. Easy to extend.
const PREDEFINED_SCHEMAS = {
  ChatMessage: ChatMessageSchema,
  WIEntry: WIEntrySchema,
} as const;

// Define all possible schema types for the dropdown and validation.
const PRIMITIVE_TYPES = ['string', 'number', 'boolean', 'object', 'anyObject', 'array', 'enum'] as const;
const ALL_SCHEMA_TYPES = [...PRIMITIVE_TYPES, ...Object.keys(PREDEFINED_SCHEMAS)] as [string, ...string[]];
const SchemaTypeEnum = z.enum(ALL_SCHEMA_TYPES);

// Recursive schema definitions for SchemaNode - EXPORTED for reuse
export type FieldDefinition = {
  id: string;
  name: string;
} & SchemaTypeDefinition;

export type SchemaTypeDefinition = {
  type: z.infer<typeof SchemaTypeEnum>;
  description?: string;
  fields?: FieldDefinition[]; // For 'object'
  items?: SchemaTypeDefinition; // For 'array'
  values?: string[]; // For 'enum'
};

// Define the recursive Zod schemas, using the pre-defined SchemaTypeEnum to avoid circular inference issues.
export const SchemaTypeDefinitionSchema: z.ZodType<SchemaTypeDefinition> = z.lazy(() =>
  z.object({
    type: SchemaTypeEnum,
    description: z.string().optional(),
    fields: z.array(FieldDefinitionSchema).optional(),
    items: SchemaTypeDefinitionSchema.optional(),
    values: z.array(z.string()).optional(),
  }),
);

export const FieldDefinitionSchema: z.ZodType<FieldDefinition> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    type: SchemaTypeEnum,
    description: z.string().optional(),
    fields: z.array(z.lazy(() => FieldDefinitionSchema)).optional(),
    items: z.lazy(() => SchemaTypeDefinitionSchema).optional(),
    values: z.array(z.string()).optional(),
  }),
);

export const SchemaNodeDataSchema = z.object({
  mode: z.enum(['custom', 'predefined']).default('custom'),
  selectedSchema: z.string().optional(),
  fields: z.array(FieldDefinitionSchema).default([]),
  _version: z.number().optional(),
});
export type SchemaNodeData = z.infer<typeof SchemaNodeDataSchema>;

const execute: NodeExecutor = async (node) => {
  const data = SchemaNodeDataSchema.parse(node.data);

  if (data.mode === 'predefined') {
    const schema = PREDEFINED_SCHEMAS[data.selectedSchema as keyof typeof PREDEFINED_SCHEMAS];
    if (!schema) {
      throw new Error(`Predefined schema "${data.selectedSchema}" not found.`);
    }
    return { result: schema };
  }

  // Custom mode
  const topLevelObjectDefinition: SchemaTypeDefinition = { type: 'object', fields: data.fields };
  const schema = buildZodSchema(topLevelObjectDefinition);
  return { result: schema };
};

const validateFields = (fields: FieldDefinition[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const names = new Set<string>();
  for (const field of fields) {
    if (!field.name || field.name.trim() === '') {
      issues.push({ message: 'Field names cannot be empty.', severity: 'error' });
    }
    if (names.has(field.name)) {
      issues.push({ message: `Duplicate field name found: "${field.name}".`, severity: 'error' });
    }
    names.add(field.name);

    if (field.type === 'object' && field.fields) {
      issues.push(...validateFields(field.fields));
    }
    if (field.type === 'enum' && (!field.values || field.values.length === 0)) {
      issues.push({ message: `Enum "${field.name}" must have at least one value.`, severity: 'error' });
    }
  }
  return issues;
};

export const schemaNodeDefinition: NodeDefinition<SchemaNodeData> = {
  type: 'schemaNode',
  label: 'Schema',
  category: 'JSON',
  component: SchemaNode,
  dataSchema: SchemaNodeDataSchema,
  currentVersion: 2,
  initialData: { fields: [], mode: 'custom' },
  handles: {
    inputs: [],
    outputs: [{ id: 'result', type: FlowDataType.SCHEMA }],
  },
  validate: (node: Node<SchemaNodeData>): ValidationIssue[] => {
    // Only validate if in custom mode.
    if (node.data.mode === 'custom') {
      return validateFields(node.data.fields);
    }
    return [];
  },
  execute,
  meta: {
    schemas: PREDEFINED_SCHEMAS,
  },
};

registrator.register(schemaNodeDefinition);

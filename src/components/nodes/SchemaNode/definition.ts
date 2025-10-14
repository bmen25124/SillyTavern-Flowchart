import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { SchemaNode } from './SchemaNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

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
  _version: z.number().optional(),
});
export type SchemaNodeData = z.infer<typeof SchemaNodeDataSchema>;

function buildZodSchema(definition: SchemaTypeDefinition): z.ZodTypeAny {
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
      if (!definition.values || definition.values.length === 0) {
        zodType = z.string();
      } else {
        zodType = z.enum(definition.values as [string, ...string[]]);
      }
      break;
    case 'object':
      const shape: Record<string, z.ZodTypeAny> = {};
      if (definition.fields) {
        for (const field of definition.fields) {
          shape[field.name] = buildZodSchema(field);
        }
      }
      zodType = z.object(shape);
      break;
    case 'array':
      if (definition.items) {
        zodType = z.array(buildZodSchema(definition.items));
      } else {
        zodType = z.array(z.any());
      }
      break;
    default:
      zodType = z.any();
  }

  if (definition.description) {
    return zodType.describe(definition.description);
  }
  return zodType;
}

const execute: NodeExecutor = async (node) => {
  const data = SchemaNodeDataSchema.parse(node.data);
  const topLevelObjectDefinition: SchemaTypeDefinition = { type: 'object', fields: data.fields };
  const schema = buildZodSchema(topLevelObjectDefinition);
  return { result: schema };
};

export const schemaNodeDefinition: NodeDefinition<SchemaNodeData> = {
  type: 'schemaNode',
  label: 'Schema',
  category: 'JSON',
  component: SchemaNode,
  dataSchema: SchemaNodeDataSchema,
  currentVersion: 1,
  initialData: { fields: [] },
  handles: {
    inputs: [{ id: 'main', type: FlowDataType.ANY }],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.SCHEMA },
    ],
  },
  execute,
};

registrator.register(schemaNodeDefinition);

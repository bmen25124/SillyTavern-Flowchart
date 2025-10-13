import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, SchemaNodeDataSchema, SchemaTypeDefinition, FieldDefinition } from '../../../flow-types.js';
import { SchemaNode } from './SchemaNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

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
  return buildZodSchema(topLevelObjectDefinition);
};

export const schemaNodeDefinition: NodeDefinition = {
  type: 'schemaNode',
  label: 'Schema',
  category: 'JSON',
  component: SchemaNode,
  dataSchema: SchemaNodeDataSchema,
  currentVersion: 1,
  initialData: { fields: [], _version: 1 },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.SCHEMA }] },
  execute,
};

registrator.register(schemaNodeDefinition);

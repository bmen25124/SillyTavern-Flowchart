import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { FieldDefinition, SchemaTypeDefinition } from '../components/nodes/SchemaNode/definition.js';
import { JsonNodeData, JsonNodeItem } from '../components/nodes/JsonNode/definition.js';

/**
 * Safely validates a value against an optional schema, throwing a formatted error on failure.
 * @param value The value to validate.
 * @param schema The Zod schema to validate against. Can be undefined.
 * @param nodeLabel A label for the node type, used in error messages.
 * @returns The validated (and possibly coerced) value, or the original value if no schema is provided.
 */
export function applySchema(value: any, schema: z.ZodType | undefined, nodeLabel: string): any {
  if (!schema) {
    return value; // No schema, no validation.
  }
  if (typeof schema.safeParse !== 'function') {
    throw new Error(`Invalid schema provided to ${nodeLabel} node.`);
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`${nodeLabel} output failed schema validation: ${result.error.message}`);
  }
  return result.data; // Return the validated/coerced data
}

export function buildZodSchema(definition: SchemaTypeDefinition): z.ZodTypeAny {
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
      zodType = buildZodSchemaFromFields(definition.fields || []);
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

export function buildZodSchemaFromFields(fields: FieldDefinition[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.name] = buildZodSchema(field);
  }
  return z.object(shape);
}

export function jsonItemToZod(item: JsonNodeItem): z.ZodType {
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

export function inferSchemaFromJsonNode(data: JsonNodeData): z.ZodType {
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

export function valueToZodSchema(value: any): z.ZodType {
  if (value === null || value === undefined) return z.any();
  switch (typeof value) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'object':
      if (Array.isArray(value)) {
        return z.array(value.length > 0 ? valueToZodSchema(value[0]) : z.any());
      }
      const shape: { [key: string]: z.ZodType } = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          shape[key] = valueToZodSchema(value[key]);
        }
      }
      return z.object(shape);
    default:
      return z.any();
  }
}

export function resolveSchemaFromHandle(
  node: Node,
  allNodes: Node[],
  allEdges: Edge[],
  targetHandle: string,
): z.ZodTypeAny | undefined {
  const schemaEdge = allEdges.find((edge) => edge.target === node.id && edge.targetHandle === targetHandle);
  if (!schemaEdge) return undefined;

  const schemaSource = allNodes.find((n) => n.id === schemaEdge.source);
  if (!schemaSource) return undefined;

  if (schemaSource.type === 'schemaNode') {
    const fields = schemaSource.data?.fields as FieldDefinition[] | undefined;
    if (!Array.isArray(fields)) return undefined;
    return buildZodSchemaFromFields(fields);
  }

  if (schemaSource.type === 'variableSchemaNode') {
    const definition = schemaSource.data?.definition as SchemaTypeDefinition | undefined;
    return definition ? buildZodSchema(definition) : undefined;
  }

  return undefined;
}

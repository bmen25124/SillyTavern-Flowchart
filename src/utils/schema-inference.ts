import { z } from 'zod';
import { JsonNodeData, JsonNodeItem } from '../components/nodes/JsonNode/definition.js';

function jsonItemToZod(item: JsonNodeItem): z.ZodType {
  switch (item.type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'array':
      return z.array(jsonItemToZod((item.value as JsonNodeItem[])[0] || { type: 'string' })); // Simplified
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
  const shape: Record<string, z.ZodType> = {};
  data.items.forEach((item) => {
    shape[item.key] = jsonItemToZod(item);
  });
  return z.object(shape);
}

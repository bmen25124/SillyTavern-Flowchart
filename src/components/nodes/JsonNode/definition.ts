import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { JsonNode } from './JsonNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

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
  _version: z.number().optional(),
});
export type JsonNodeData = z.infer<typeof JsonNodeDataSchema>;

const buildValue = (item: JsonNodeItem): any => {
  switch (item.type) {
    case 'string':
    case 'number':
    case 'boolean':
      return item.value;
    case 'object':
      const obj: { [key: string]: any } = {};
      for (const child of item.value as JsonNodeItem[]) {
        obj[child.key] = buildValue(child);
      }
      return obj;
    case 'array':
      return (item.value as JsonNodeItem[]).map(buildValue);
  }
};

const execute: NodeExecutor = async (node) => {
  const data = JsonNodeDataSchema.parse(node.data);

  if (data.rootType === 'array') {
    return { result: data.items.map(buildValue) };
  }

  const rootObject: { [key: string]: any } = {};
  for (const item of data.items) {
    rootObject[item.key] = buildValue(item);
  }
  return { result: rootObject, ...rootObject };
};

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

function zodTypeToFlowType(type: z.ZodType): FlowDataType {
  if (type instanceof z.ZodNumber) return FlowDataType.NUMBER;
  if (type instanceof z.ZodString) return FlowDataType.STRING;
  if (type instanceof z.ZodBoolean) return FlowDataType.BOOLEAN;
  return FlowDataType.OBJECT; // Includes arrays, objects, etc.
}

export const jsonNodeDefinition: NodeDefinition<JsonNodeData> = {
  type: 'jsonNode',
  label: 'JSON',
  category: 'JSON',
  component: JsonNode,
  dataSchema: JsonNodeDataSchema,
  currentVersion: 1,
  initialData: { items: [], rootType: 'object' },
  handles: {
    inputs: [{ id: 'main', type: FlowDataType.ANY }],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.OBJECT },
    ],
  },
  execute,
  getDynamicHandles: (node) => {
    const data = node.data;
    const fullSchema = inferSchemaFromJsonNode(data);
    const outputs = [{ id: 'result', type: FlowDataType.OBJECT, schema: fullSchema }];

    if (data.rootType === 'object') {
      for (const item of data.items) {
        if (!item.key) continue;
        const itemSchema = jsonItemToZod(item);
        outputs.push({
          id: item.key,
          type: zodTypeToFlowType(itemSchema),
          schema: itemSchema,
        });
      }
    }

    return { inputs: [], outputs };
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'output') {
      if (handleId === 'result') return FlowDataType.OBJECT;

      const data = node.data as JsonNodeData;
      if (data.rootType === 'object') {
        const item = data.items.find((item) => item.key === handleId);
        if (item) {
          return zodTypeToFlowType(jsonItemToZod(item));
        }
      }
    }
    return undefined;
  },
};

registrator.register(jsonNodeDefinition);

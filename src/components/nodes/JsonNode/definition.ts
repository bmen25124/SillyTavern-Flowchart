import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, JsonNodeDataSchema, JsonNodeData, JsonNodeItem } from '../../../flow-types.js';
import { JsonNode } from './JsonNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const execute: NodeExecutor = async (node) => {
  const data = JsonNodeDataSchema.parse(node.data);

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

  if (data.rootType === 'array') {
    return data.items.map(buildValue);
  }

  const rootObject: { [key: string]: any } = {};
  for (const item of data.items) {
    rootObject[item.key] = buildValue(item);
  }
  return rootObject;
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

export const jsonNodeDefinition: NodeDefinition = {
  type: 'jsonNode',
  label: 'JSON',
  category: 'JSON',
  component: JsonNode,
  dataSchema: JsonNodeDataSchema,
  currentVersion: 1,
  initialData: { items: [], rootType: 'object', _version: 1 },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.OBJECT }] },
  execute,
  getDynamicHandles: (node) => ({
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.OBJECT, schema: inferSchemaFromJsonNode(node.data) }],
  }),
};

registrator.register(jsonNodeDefinition);

import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue, HandleSpec } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { JsonNode } from './JsonNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';
import { getHandleSpec } from '../../../utils/handle-logic.js';

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

const buildValue = (item: JsonNodeItem, input: Record<string, any>): any => {
  if (Object.prototype.hasOwnProperty.call(input, item.id)) {
    return input[item.id];
  }
  switch (item.type) {
    case 'string':
    case 'number':
    case 'boolean':
      return item.value;
    case 'object':
      const obj: { [key: string]: any } = {};
      for (const child of item.value as JsonNodeItem[]) {
        obj[child.key] = buildValue(child, input);
      }
      return obj;
    case 'array':
      return (item.value as JsonNodeItem[]).map((child) => buildValue(child, input));
  }
};

const execute: NodeExecutor = async (node, input) => {
  const data = JsonNodeDataSchema.parse(node.data);

  if (data.rootType === 'array') {
    return { result: data.items.map((item) => buildValue(item, input)) };
  }

  const rootObject: { [key: string]: any } = {};
  for (const item of data.items) {
    rootObject[item.key] = buildValue(item, input);
  }
  return { result: rootObject, ...rootObject };
};

const validateItems = (items: JsonNodeItem[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const keys = new Set<string>();
  for (const item of items) {
    if (!item.key || item.key.trim() === '') {
      issues.push({ message: 'Object keys cannot be empty.', severity: 'error' });
    }
    if (keys.has(item.key)) {
      issues.push({ message: `Duplicate key found: "${item.key}".`, severity: 'error' });
    }
    keys.add(item.key);

    if (item.type === 'object' || item.type === 'array') {
      issues.push(...validateItems(item.value as JsonNodeItem[]));
    }
  }
  return issues;
};

function getItemHandles(items: JsonNodeItem[]): HandleSpec[] {
  let handles: HandleSpec[] = [];
  for (const item of items) {
    switch (item.type) {
      case 'string':
        handles.push({ id: item.id, type: FlowDataType.STRING });
        break;
      case 'number':
        handles.push({ id: item.id, type: FlowDataType.NUMBER });
        break;
      case 'boolean':
        handles.push({ id: item.id, type: FlowDataType.BOOLEAN });
        break;
      case 'object':
        handles.push({ id: item.id, type: FlowDataType.OBJECT });
        handles.push(...getItemHandles(item.value as JsonNodeItem[]));
        break;
      case 'array':
        handles.push({ id: item.id, type: FlowDataType.ARRAY });
        handles.push(...getItemHandles(item.value as JsonNodeItem[]));
        break;
    }
  }
  return handles;
}

function findItemById(items: JsonNodeItem[], id: string): JsonNodeItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.type === 'object' || item.type === 'array') {
      const found = findItemById(item.value as JsonNodeItem[], id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Recursively builds a Zod schema for a JsonNodeItem, prioritizing connected input schemas.
 */
function buildSchemaForItem(item: JsonNodeItem, nodeId: string, allNodes: Node[], allEdges: Edge[]): z.ZodType {
  // 1. Check if this item's input handle is connected
  const edge = allEdges.find((e) => e.target === nodeId && e.targetHandle === item.id);
  if (edge) {
    const sourceNode = allNodes.find((n) => n.id === edge.source);
    if (sourceNode) {
      const sourceSpec = getHandleSpec(sourceNode, edge.sourceHandle || null, 'output', allNodes, allEdges);
      // If the connected source provides a schema, use it directly. This is the override.
      if (sourceSpec?.schema) {
        return sourceSpec.schema;
      }
    }
  }

  // 2. If not connected, build schema based on the item's own type and children.
  switch (item.type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'object': {
      const shape: Record<string, z.ZodType> = {};
      (item.value as JsonNodeItem[]).forEach((child) => {
        if (child.key) {
          shape[child.key] = buildSchemaForItem(child, nodeId, allNodes, allEdges);
        }
      });
      return z.object(shape);
    }
    case 'array': {
      const firstChild = (item.value as JsonNodeItem[])?.[0];
      const itemSchema = firstChild ? buildSchemaForItem(firstChild, nodeId, allNodes, allEdges) : z.any();
      return z.array(itemSchema);
    }
    default:
      return z.any();
  }
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
  validate: (node: Node<JsonNodeData>): ValidationIssue[] => {
    if (node.data.rootType !== 'object') return []; // No key validation for root arrays
    return validateItems(node.data.items);
  },
  execute,
  getDynamicHandles: (node, allNodes, allEdges) => {
    const data = node.data as JsonNodeData;
    const inputs = getItemHandles(data.items);

    // Build the complete output schema by recursively inspecting items and their connections
    const rootSchema =
      data.rootType === 'array'
        ? z.array(data.items.length > 0 ? buildSchemaForItem(data.items[0], node.id, allNodes, allEdges) : z.any())
        : z.object(
            Object.fromEntries(
              data.items.map((item) => [item.key, buildSchemaForItem(item, node.id, allNodes, allEdges)]),
            ),
          );

    const outputs: HandleSpec[] = [{ id: 'result', type: zodTypeToFlowType(rootSchema), schema: rootSchema }];

    if (data.rootType === 'object' && rootSchema instanceof z.ZodObject) {
      data.items.forEach((item) => {
        if (!item.key) return;
        const itemSchema = rootSchema.shape[item.key];
        if (itemSchema) {
          outputs.push({
            id: item.key,
            type: zodTypeToFlowType(itemSchema),
            schema: itemSchema,
          });
        }
      });
    }

    return { inputs, outputs };
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'input' && handleId) {
      const item = findItemById((node.data as JsonNodeData).items, handleId);
      if (item) {
        switch (item.type) {
          case 'string':
            return FlowDataType.STRING;
          case 'number':
            return FlowDataType.NUMBER;
          case 'boolean':
            return FlowDataType.BOOLEAN;
          case 'object':
            return FlowDataType.OBJECT;
          case 'array':
            return FlowDataType.ARRAY;
        }
      }
    }
    return undefined;
  },
};

registrator.register(jsonNodeDefinition);

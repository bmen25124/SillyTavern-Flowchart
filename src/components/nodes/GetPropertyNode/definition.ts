import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput, get } from '../../../utils/node-logic.js';
import { getHandleSpec } from '../../../utils/handle-logic.js';
import { GetPropertyNode } from './GetPropertyNode.js';

export const GetPropertyNodeDataSchema = z.object({
  path: z.string().default(''),
  _version: z.number().optional(),
});
export type GetPropertyNodeData = z.infer<typeof GetPropertyNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = GetPropertyNodeDataSchema.parse(node.data);
  const path = resolveInput(input, data, 'path');
  const obj = input.object;

  if (!path) throw new Error('Property path is required.');
  if (typeof obj !== 'object' || obj === null) throw new Error('Input is not a valid object.');

  const value = get(obj, path, undefined);
  return { value: value };
};

// Helper to recursively find a Zod type within a nested Zod schema based on a dot-notation path.
function zodTypeFromPath(schema: z.ZodType, path: string): z.ZodType | undefined {
  if (path === '') return schema;

  // Normalize path to handle both dot and bracket notation for arrays
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let currentSchema: z.ZodType | undefined = schema;

  for (const part of parts) {
    if (!currentSchema) return undefined;

    // @ts-ignore
    let unwrapped = currentSchema;
    // Repeatedly unwrap to get to the core type (e.g., from ZodOptional<ZodNullable<ZodObject<...>>> to ZodObject<...>)
    while ('unwrap' in unwrapped && typeof unwrapped.unwrap === 'function') {
      unwrapped = unwrapped.unwrap();
    }

    if (unwrapped instanceof z.ZodObject) {
      currentSchema = unwrapped.shape[part];
    } else if (unwrapped instanceof z.ZodArray) {
      // If we're at an array, the path part must be an index. We don't validate the index itself,
      // but instead transition to the array's element schema for the next part of the path.
      if (!isNaN(parseInt(part, 10))) {
        // @ts-ignore
        currentSchema = unwrapped.element;
      } else {
        return undefined; // Invalid path part for an array
      }
    } else {
      return undefined; // Primitive type, cannot traverse further
    }
  }
  return currentSchema;
}

export const getPropertyNodeDefinition: NodeDefinition<GetPropertyNodeData> = {
  type: 'getPropertyNode',
  label: 'Get Property',
  category: 'Utility',
  component: GetPropertyNode,
  dataSchema: GetPropertyNodeDataSchema,
  currentVersion: 1,
  initialData: { path: '' },
  handles: {
    inputs: [
      { id: 'object', type: FlowDataType.OBJECT },
      { id: 'path', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'value', type: FlowDataType.ANY }],
  },
  execute,
  getHandleType: ({ handleId, handleDirection, node, nodes, edges }) => {
    if (handleDirection === 'output' && handleId === 'value') {
      const edge = edges.find((e) => e.target === node.id && e.targetHandle === 'object');
      if (!edge) return FlowDataType.ANY;

      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) return FlowDataType.ANY;

      const sourceHandleSpec = getHandleSpec(sourceNode, edge.sourceHandle || null, 'output', nodes, edges);
      if (!sourceHandleSpec?.schema) return FlowDataType.ANY;

      const propertySchema = zodTypeFromPath(sourceHandleSpec.schema, (node.data as GetPropertyNodeData).path);
      if (propertySchema instanceof z.ZodString) return FlowDataType.STRING;
      if (propertySchema instanceof z.ZodNumber) return FlowDataType.NUMBER;
      if (propertySchema instanceof z.ZodBoolean) return FlowDataType.BOOLEAN;
      if (propertySchema instanceof z.ZodObject || propertySchema instanceof z.ZodArray) return FlowDataType.OBJECT;
    }
    return undefined; // Fallback to default
  },
};

registrator.register(getPropertyNodeDefinition);

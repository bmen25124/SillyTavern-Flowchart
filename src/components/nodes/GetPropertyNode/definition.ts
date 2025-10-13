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

  const parts = path.split('.');
  let currentSchema: z.ZodType | undefined = schema;

  for (const part of parts) {
    if (!currentSchema) return undefined;

    // Unwrap optional/nullable types to get to the core object
    if ('unwrap' in currentSchema && typeof currentSchema.unwrap === 'function') {
      currentSchema = currentSchema.unwrap();
    }

    if (currentSchema instanceof z.ZodObject) {
      currentSchema = currentSchema.shape[part];
    } else {
      return undefined;
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

import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput, get } from '../../../utils/node-logic.js';
import { getHandleSpec } from '../../../utils/handle-logic.js';
import { GetPropertyNode } from './GetPropertyNode.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';

export const GetPropertyNodeDataSchema = z.object({
  path: z.string().optional(),
  _version: z.number().optional(),
});
export type GetPropertyNodeData = z.infer<typeof GetPropertyNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = GetPropertyNodeDataSchema.parse(node.data);
  const path = resolveInput(input, data, 'path');
  const obj = input.object;

  if (!path) throw new Error(`Property path is required in node ${node.type}.`);
  if (typeof obj !== 'object' || obj === null) throw new Error(`Input is not a valid object in ${node.type}.`);

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
      // @ts-ignore
      unwrapped = unwrapped.unwrap();
    }
    // Now, unwrap inner types like promises or transforms
    while ('innerType' in unwrapped && typeof unwrapped.innerType === 'function') {
      // @ts-ignore
      unwrapped = unwrapped.innerType();
    }
    // Ensure the unwrapped type is still a Zod type
    if (!(unwrapped instanceof z.ZodType)) return undefined;

    if (unwrapped instanceof z.ZodObject) {
      currentSchema = unwrapped.shape[part];
    } else if (unwrapped instanceof z.ZodArray) {
      // If we're at an array, the path part must be an index (e.g., '0', '1').
      // We don't validate the index, we step into the array's element schema for the next part of the path.
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
  category: 'Variables',
  component: GetPropertyNode,
  dataSchema: GetPropertyNodeDataSchema,
  currentVersion: 1,
  initialData: { path: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'object', type: FlowDataType.OBJECT },
      { id: 'path', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.ANY },
    ],
  },
  validate: combineValidators(
    createRequiredFieldValidator('path', 'Property Path is required.'),
    (node: Node<GetPropertyNodeData>, edges: Edge[]): ValidationIssue | undefined => {
      if (!edges.some((e) => e.target === node.id && e.targetHandle === 'object')) {
        return { message: 'An object must be connected to the "object" input.', severity: 'error' };
      }
      return undefined;
    },
  ),
  execute,
  getDynamicHandles: (node, nodes, edges) => {
    const data = GetPropertyNodeDataSchema.parse(node.data);
    const path = data.path;

    // 1. Find the schema from the connected source node
    const edge = edges.find((e) => e.target === node.id && e.targetHandle === 'object');
    let outputSchema: z.ZodTypeAny = z.any();
    let outputType = FlowDataType.ANY;

    if (edge) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (sourceNode) {
        const sourceHandleSpec = getHandleSpec(sourceNode, edge.sourceHandle || null, 'output', nodes, edges);
        if (sourceHandleSpec?.schema) {
          const propertySchema = zodTypeFromPath(sourceHandleSpec.schema, path ?? '');
          if (propertySchema) {
            outputSchema = propertySchema;
            outputType = zodTypeToFlowType(propertySchema);
          }
        }
      }
    }

    return {
      inputs: [],
      outputs: [{ id: 'value', type: outputType, schema: outputSchema }],
    };
  },
};

registrator.register(getPropertyNodeDefinition);

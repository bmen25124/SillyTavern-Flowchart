import { Node, Edge } from '@xyflow/react';
import { z } from 'zod';
import { HandleSpec } from '../components/nodes/definitions/types.js';
import { registrator } from '../components/nodes/autogen-imports.js';
import { zodTypeToFlowType } from './type-mapping.js';

export function getHandleSpec(
  node: Node,
  handleId: string | null,
  direction: 'input' | 'output',
  allNodes: Node[],
  allEdges: Edge[],
): HandleSpec | undefined {
  if (!node.type) return undefined;
  const definition = registrator.nodeDefinitionMap.get(node.type);
  if (!definition) return undefined;

  if (definition.getDynamicHandles) {
    const dynamicHandles = definition.getDynamicHandles(node, allNodes, allEdges);
    const handle = (direction === 'input' ? dynamicHandles.inputs : dynamicHandles.outputs).find(
      (h) => h.id === handleId,
    );
    if (handle) return handle;
  }

  const staticHandles = direction === 'input' ? definition.handles.inputs : definition.handles.outputs;
  return staticHandles.find((h) => h.id === handleId);
}

/**
 * Creates an array of HandleSpec objects for each property in a ZodObject schema.
 * @param schema The ZodObject schema to generate handles for.
 * @returns An array of HandleSpec objects for dynamic output handles.
 */
export function createDynamicOutputHandlesForSchema(schema: z.ZodType): HandleSpec[] {
  const handles: HandleSpec[] = [];

  if (schema instanceof z.ZodObject) {
    for (const key in schema.shape) {
      if (Object.prototype.hasOwnProperty.call(schema.shape, key)) {
        const fieldSchema = schema.shape[key];
        handles.push({
          id: key,
          type: zodTypeToFlowType(fieldSchema),
          schema: fieldSchema,
        });
      }
    }
  }

  return handles;
}

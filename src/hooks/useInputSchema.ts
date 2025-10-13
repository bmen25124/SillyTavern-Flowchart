import { useMemo } from 'react';
import { useEdges, useNodes } from '@xyflow/react';
import { z } from 'zod';
import { getHandleSpec } from '../utils/handle-logic.js';
import { FlowDataType } from '../flow-types.js';
import { registrator } from '../components/nodes/autogen-imports.js';

/**
 * A hook that recursively traces back through connections to find the most specific
 * schema for a given input handle. It can "see through" generic passthrough nodes.
 *
 * @param nodeId The ID of the node whose input is being inspected.
 * @param handleId The ID of the input handle being inspected.
 * @returns The inferred Zod schema, or undefined if none could be found.
 */
export const useInputSchema = (nodeId: string, handleId: string | null): z.ZodType | undefined => {
  const allNodes = useNodes();
  const allEdges = useEdges();

  return useMemo(() => {
    const visited = new Set<string>(); // To prevent infinite loops in case of cycles

    const findSourceSchema = (
      targetNodeId: string,
      targetHandleId: string | null,
      depth = 0,
    ): z.ZodType | undefined => {
      // Safety break for deep or cyclical graphs
      if (depth > 20 || visited.has(`${targetNodeId}-${targetHandleId}`)) {
        return undefined;
      }
      visited.add(`${targetNodeId}-${targetHandleId}`);

      const edge = allEdges.find((e) => e.target === targetNodeId && e.targetHandle == targetHandleId);
      if (!edge) {
        return undefined;
      }

      const sourceNode = allNodes.find((n) => n.id === edge.source);
      if (!sourceNode?.type) {
        return undefined;
      }

      const spec = getHandleSpec(sourceNode, edge.sourceHandle || null, 'output', allNodes, allEdges);
      if (!spec) {
        return undefined;
      }

      // If we found a specific schema, we're done.
      if (spec.schema) {
        return spec.schema;
      }

      // If the source is a passthrough node with a generic output,
      // recursively trace its input to find the original schema.
      const sourceDef = registrator.nodeDefinitionMap.get(sourceNode.type);
      if (spec.type === FlowDataType.ANY && sourceDef?.isPassthrough) {
        return findSourceSchema(sourceNode.id, sourceDef.passthroughHandleId ?? null, depth + 1);
      }

      // If it's not a passthrough node and has no schema, we stop here.
      return undefined;
    };

    return findSourceSchema(nodeId, handleId);
  }, [nodeId, handleId, allNodes, allEdges]);
};

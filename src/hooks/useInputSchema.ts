import { useMemo } from 'react';
import { useEdges, useNodes } from '@xyflow/react';
import { z } from 'zod';
import { nodeDefinitionMap } from '../components/nodes/definitions/definitions.js';

export const useInputSchema = (nodeId: string, handleId: string | null): z.ZodType | undefined => {
  const nodes = useNodes();
  const edges = useEdges();

  return useMemo(() => {
    const edge = edges.find((e) => e.target === nodeId && e.targetHandle === handleId);
    if (!edge) return undefined;

    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (!sourceNode || !sourceNode.type) return undefined;

    const definition = nodeDefinitionMap.get(sourceNode.type);
    if (!definition) return undefined;

    // This simplistic approach works for static handles.
    // A more advanced version would need to handle dynamic handles.
    const outputHandleSpec = definition.handles.outputs.find((h) => h.id === edge.sourceHandle);

    return outputHandleSpec?.schema;
  }, [nodeId, handleId, nodes, edges]);
};

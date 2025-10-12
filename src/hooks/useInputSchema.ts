import { useMemo } from 'react';
import { useEdges, useNodes } from '@xyflow/react';
import { z } from 'zod';
import { getHandleSpec } from '../utils/handle-logic.js';

export const useInputSchema = (nodeId: string, handleId: string | null): z.ZodType | undefined => {
  const allNodes = useNodes();
  const allEdges = useEdges();

  return useMemo(() => {
    const edge = allEdges.find((e) => e.target === nodeId && e.targetHandle === handleId);
    if (!edge) return undefined;

    const sourceNode = allNodes.find((n) => n.id === edge.source);
    if (!sourceNode) return undefined;

    const spec = getHandleSpec(sourceNode, edge.sourceHandle || null, 'output', allNodes, allEdges);
    return spec?.schema;
  }, [nodeId, handleId, allNodes, allEdges]);
};

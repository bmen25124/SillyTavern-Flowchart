import { useMemo } from 'react';
import { useEdges } from '@xyflow/react';

/**
 * A performant hook that returns a Set of all connected `targetHandle` IDs for a given node.
 * It memoizes the result and only recalculates when the edges or nodeId change.
 * @param nodeId The ID of the node to check for connections.
 * @returns A `Set<string>` containing the IDs of all connected target handles.
 */
export const useConnectedHandles = (nodeId: string) => {
  const edges = useEdges();

  return useMemo(() => {
    const connectedTargetHandles = new Set<string>();
    for (const edge of edges) {
      if (edge.target === nodeId && edge.targetHandle) {
        connectedTargetHandles.add(edge.targetHandle);
      }
    }
    return connectedTargetHandles;
  }, [edges, nodeId]);
};

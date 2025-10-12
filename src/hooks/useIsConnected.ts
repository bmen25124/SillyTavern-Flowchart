import { useEdges } from '@xyflow/react';

export const useIsConnected = (nodeId: string, handleId: string) => {
  const edges = useEdges();
  return edges.some((edge) => edge.target === nodeId && edge.targetHandle === handleId);
};

import { useConnectedHandles } from './useConnectedHandles.js';

export const useIsConnected = (nodeId: string, handleId: string) => {
  const connectedHandles = useConnectedHandles(nodeId);
  return connectedHandles.has(handleId);
};

import { Connection, Edge, Node } from '@xyflow/react';
import { areFlowDataTypesCompatible } from '../flow-types.js';
import { getHandleSpec } from './handle-logic.js';

export function checkConnectionValidity(connection: Edge | Connection, nodes: Node[], edges: Edge[]): boolean {
  // A target handle can only have one connection.
  const targetHandleHasConnection = edges.some(
    (edge) => edge.target === connection.target && edge.targetHandle === connection.targetHandle,
  );

  if (targetHandleHasConnection) {
    return false;
  }

  const sourceNode = nodes.find((node) => node.id === connection.source);
  const targetNode = nodes.find((node) => node.id === connection.target);

  if (!sourceNode || !targetNode || !sourceNode.type || !targetNode.type) {
    return false;
  }

  const sourceHandleSpec = getHandleSpec(sourceNode, connection.sourceHandle ?? null, 'output', nodes, edges);
  const targetHandleSpec = getHandleSpec(targetNode, connection.targetHandle ?? null, 'input', nodes, edges);

  const sourceHandleType = sourceHandleSpec?.type;
  const targetHandleType = targetHandleSpec?.type;

  if (!sourceHandleType || !targetHandleType) {
    return false;
  }

  return areFlowDataTypesCompatible(sourceHandleType, targetHandleType);
}

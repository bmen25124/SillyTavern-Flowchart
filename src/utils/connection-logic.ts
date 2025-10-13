import { Connection, Edge, Node } from '@xyflow/react';
import { FlowDataType } from '../flow-types.js';
import { registrator } from '../components/nodes/autogen-imports.js';

function getHandleType(
  node: Node,
  handleId: string | null,
  handleDirection: 'input' | 'output',
  nodes: Node[],
  edges: Edge[],
): FlowDataType | undefined {
  if (!node.type) return undefined;
  const definition = registrator.nodeDefinitionMap.get(node.type);
  if (!definition) return undefined;

  if (definition.getHandleType) {
    const dynamicType = definition.getHandleType({ handleId, handleDirection, node, nodes, edges });
    if (dynamicType !== undefined) return dynamicType;
  }

  const staticHandles = handleDirection === 'input' ? definition.handles.inputs : definition.handles.outputs;
  return staticHandles.find((h) => h.id === handleId)?.type;
}

export function checkConnectionValidity(connection: Edge | Connection, nodes: Node[], edges: Edge[]): boolean {
  const sourceNode = nodes.find((node) => node.id === connection.source);
  const targetNode = nodes.find((node) => node.id === connection.target);

  if (!sourceNode || !targetNode || !sourceNode.type || !targetNode.type) {
    return false;
  }
  if (sourceNode.type === 'groupNode' || targetNode.type === 'groupNode') return false;

  const sourceHandleType = getHandleType(sourceNode, connection.sourceHandle ?? null, 'output', nodes, edges);
  const targetHandleType = getHandleType(targetNode, connection.targetHandle ?? null, 'input', nodes, edges);

  if (!sourceHandleType || !targetHandleType) {
    return false;
  }

  if (sourceHandleType === FlowDataType.ANY || targetHandleType === FlowDataType.ANY) {
    return true;
  }

  if (
    (targetHandleType === FlowDataType.PROFILE_ID && sourceHandleType === FlowDataType.STRING) ||
    (targetHandleType === FlowDataType.STRING && sourceHandleType === FlowDataType.PROFILE_ID)
  ) {
    return true;
  }

  if (targetHandleType === FlowDataType.OBJECT && sourceHandleType === FlowDataType.STRUCTURED_RESULT) {
    return true;
  }

  return sourceHandleType === targetHandleType;
}

import { Node, Edge } from '@xyflow/react';
import { HandleSpec } from '../components/nodes/definitions/types.js';
import { registrator } from '../components/nodes/autogen-imports.js';

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

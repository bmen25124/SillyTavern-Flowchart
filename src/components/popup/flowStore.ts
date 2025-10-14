import { create } from 'zustand';
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import { temporal } from 'zundo';
import { SpecEdge, SpecFlow, SpecNode } from '../../flow-spec.js';
import { runMigrations } from '../../migrations.js';
import { registrator } from '../nodes/autogen-imports.js';

type Clipboard = {
  nodes: Node[];
  edges: Edge[];
};

export type FlowState = {
  nodes: Node[];
  edges: Edge[];
  nodesMap: Map<string, Node>;
  clipboard: Clipboard | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  updateNodeData: (nodeId: string, data: object) => void;
  toggleNodeDisabled: (nodeIds: string[]) => void;
  loadFlow: (flowData: SpecFlow) => void;
  getSpecFlow: () => SpecFlow;
  addNode: (node: Omit<Node, 'id'>) => Node;
  duplicateNode: (nodeId: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  copySelection: () => void;
  paste: (position: { x: number; y: number }) => void;
};

const toSpecNode = (node: Node): SpecNode => ({
  id: node.id,
  type: node.type!,
  position: node.position,
  data: node.data,
  width: node.width,
  height: node.height,
});

const fromSpecNode = (specNode: SpecNode): Node => ({
  id: specNode.id,
  type: specNode.type,
  position: specNode.position ?? { x: 0, y: 0 },
  data: specNode.data,
  width: specNode.width || undefined,
  height: specNode.height || undefined,
});

const toSpecEdge = (edge: Edge): SpecEdge => ({
  id: edge.id,
  source: edge.source,
  sourceHandle: edge.sourceHandle ?? null,
  target: edge.target,
  targetHandle: edge.targetHandle ?? null,
});

const fromSpecEdge = (specEdge: SpecEdge): Edge => ({
  id: specEdge.id,
  source: specEdge.source,
  sourceHandle: specEdge.sourceHandle,
  target: specEdge.target,
  targetHandle: specEdge.targetHandle,
});

const getValidHandleIds = (node: Node, direction: 'input' | 'output', allNodes: Node[], allEdges: Edge[]) => {
  const ids = new Set<string | null>();
  if (!node.type) return ids;

  const definition = registrator.nodeDefinitionMap.get(node.type);
  if (!definition) return ids;

  const staticHandles = direction === 'input' ? definition.handles.inputs : definition.handles.outputs;
  staticHandles.forEach((h) => ids.add(h.id));

  if (definition.getDynamicHandles) {
    const dynamicHandles = definition.getDynamicHandles(node, allNodes, allEdges);
    const handles = direction === 'input' ? dynamicHandles.inputs : dynamicHandles.outputs;
    handles.forEach((h) => ids.add(h.id));
  }
  return ids;
};

const cleanupEdges = (nodes: Node[], edges: Edge[]): Edge[] => {
  const nodesMap = new Map(nodes.map((n) => [n.id, n]));

  return edges.filter((edge) => {
    const sourceNode = nodesMap.get(edge.source);
    const targetNode = nodesMap.get(edge.target);

    if (!sourceNode || !targetNode) return false;

    const sourceHandleIds = getValidHandleIds(sourceNode, 'output', nodes, edges);
    if (!sourceHandleIds.has(edge.sourceHandle ?? null)) {
      return false;
    }

    const targetHandleIds = getValidHandleIds(targetNode, 'input', nodes, edges);
    if (!targetHandleIds.has(edge.targetHandle ?? null)) {
      return false;
    }

    return true;
  });
};

export const useFlowStore = create(
  temporal<FlowState>(
    (set, get) => ({
      nodes: [],
      edges: [],
      nodesMap: new Map(),
      clipboard: null,
      setNodes: (nodes) => {
        set({ nodes, nodesMap: new Map(nodes.map((n) => [n.id, n])) });
      },
      setEdges: (edges) => set({ edges }),
      onNodesChange: (changes: NodeChange[]) => {
        set((state) => {
          const nextNodes = applyNodeChanges(changes, state.nodes);
          const cleanedEdges = cleanupEdges(nextNodes, state.edges);

          return {
            nodes: nextNodes,
            edges: cleanedEdges,
            nodesMap: new Map(nextNodes.map((n) => [n.id, n])),
          };
        });
      },
      onEdgesChange: (changes: EdgeChange[]) => {
        set((state) => {
          const nextEdges = applyEdgeChanges(changes, state.edges);
          const cleanedEdges = cleanupEdges(state.nodes, nextEdges);

          return {
            edges: cleanedEdges,
          };
        });
      },
      onConnect: (connection) => {
        set((state) => ({
          edges: addEdge(connection, state.edges),
        }));
      },
      updateNodeData: (nodeId, newData) => {
        const node = get().nodesMap.get(nodeId);
        if (!node) return;
        // This triggers onNodesChange, which handles the cleanup.
        // @ts-ignore
        get().onNodesChange([{ type: 'replace', id: nodeId, data: { ...node.data, ...newData } }]);
      },
      toggleNodeDisabled: (nodeIds) => {
        // @ts-ignore
        const changes: NodeChange[] = nodeIds.map((nodeId) => {
          const node = get().nodesMap.get(nodeId);
          if (!node) return { type: 'select', id: nodeId, selected: false }; // No-op
          return { type: 'replace', id: nodeId, data: { ...node.data, disabled: !node.data.disabled } };
        });
        get().onNodesChange(changes.filter((c) => c.type === 'replace'));
      },
      loadFlow: (flowData) => {
        const migratedFlow = runMigrations(flowData);
        const nodes = (migratedFlow.nodes || []).map(fromSpecNode);
        set({
          nodes: nodes,
          edges: (migratedFlow.edges || []).map(fromSpecEdge),
          nodesMap: new Map(nodes.map((n) => [n.id, n])),
        });
      },
      getSpecFlow: () => {
        return {
          nodes: get().nodes.map(toSpecNode),
          edges: get().edges.map(toSpecEdge),
        };
      },
      addNode: (node) => {
        const newNode = { ...node, id: crypto.randomUUID() };
        if (newNode.type === 'ifNode' && newNode.data.conditions) {
          // @ts-ignore
          newNode.data.conditions = newNode.data.conditions.map((c: any) => ({
            ...c,
            id: crypto.randomUUID(),
          }));
        }
        set((state) => {
          const newNodes = [...state.nodes, newNode];
          return {
            nodes: newNodes,
            nodesMap: new Map(newNodes.map((n) => [n.id, n])),
          };
        });
        return newNode;
      },
      duplicateNode: (nodeId) => {
        const nodeToDuplicate = get().nodesMap.get(nodeId);
        if (!nodeToDuplicate) return;
        const newNode: Node = {
          ...structuredClone(nodeToDuplicate),
          id: crypto.randomUUID(),
          position: {
            x: nodeToDuplicate.position.x + 50,
            y: nodeToDuplicate.position.y + 50,
          },
          selected: false,
        };
        if (newNode.type === 'ifNode' && newNode.data.conditions) {
          // @ts-ignore
          newNode.data.conditions = newNode.data.conditions.map((c: any) => ({
            ...c,
            id: crypto.randomUUID(),
          }));
        }
        set((state) => {
          const newNodes = [...state.nodes, newNode];
          return {
            nodes: newNodes,
            nodesMap: new Map(newNodes.map((n) => [n.id, n])),
          };
        });
      },
      copySelection: () => {
        const { nodes, edges } = get();
        const selectedNodes = nodes.filter((n) => n.selected);
        if (selectedNodes.length === 0) return;
        const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
        const selectedEdges = edges.filter((e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target));
        set({ clipboard: { nodes: structuredClone(selectedNodes), edges: structuredClone(selectedEdges) } });
      },
      paste: (position) => {
        const { clipboard } = get();
        if (!clipboard || clipboard.nodes.length === 0) return;
        const idMapping = new Map<string, string>();
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        const minX = Math.min(...clipboard.nodes.map((n) => n.position.x));
        const minY = Math.min(...clipboard.nodes.map((n) => n.position.y));
        clipboard.nodes.forEach((node) => {
          const newId = crypto.randomUUID();
          idMapping.set(node.id, newId);
          if (node.type === 'ifNode' && node.data.conditions) {
            // @ts-ignore
            node.data.conditions = node.data.conditions.map((c: any) => ({
              ...c,
              id: crypto.randomUUID(),
            }));
          }
          newNodes.push({
            ...node,
            id: newId,
            selected: true,
            position: {
              x: position.x + (node.position.x - minX),
              y: position.y + (node.position.y - minY),
            },
          });
        });
        clipboard.edges.forEach((edge) => {
          const newSource = idMapping.get(edge.source);
          const newTarget = idMapping.get(edge.target);
          if (newSource && newTarget) {
            newEdges.push({
              ...edge,
              id: crypto.randomUUID(),
              source: newSource,
              target: newTarget,
            });
          }
        });
        set((state) => {
          const deselectNodes = state.nodes.map((n) => ({ ...n, selected: false }));
          const finalNodes = [...deselectNodes, ...newNodes];
          return {
            nodes: finalNodes,
            edges: [...state.edges, ...newEdges],
            nodesMap: new Map(finalNodes.map((n) => [n.id, n])),
          };
        });
      },
    }),
    {
      // @ts-ignore
      partialize: (state) => {
        const { nodes, edges } = state;
        return { nodes, edges };
      },
      limit: 50,
    },
  ),
);

useFlowStore.subscribe((state, prevState) => {
  if (state.nodes !== prevState.nodes) {
    useFlowStore.setState({ nodesMap: new Map(state.nodes.map((n) => [n.id, n])) });
  }
});

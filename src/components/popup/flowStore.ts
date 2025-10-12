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
} from '@xyflow/react';
import { SpecEdge, SpecFlow, SpecNode } from '../../flow-spec.js';

type FlowState = {
  nodes: Node[];
  edges: Edge[];
  nodesMap: Map<string, Node>;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  updateNodeData: (nodeId: string, data: object) => void;
  loadFlow: (flowData: SpecFlow) => void;
  getSpecFlow: () => SpecFlow;
  addNode: (node: Omit<Node, 'id'>) => Node;
  duplicateNode: (nodeId: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
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

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  nodesMap: new Map(),
  setNodes: (nodes) => {
    set({ nodes, nodesMap: new Map(nodes.map((n) => [n.id, n])) });
  },
  setEdges: (edges) => set({ edges }),
  onNodesChange: (changes) => {
    const newNodes = applyNodeChanges(changes, get().nodes);
    const newNodesMap = new Map(get().nodesMap);

    // Manually apply changes to the map for consistency
    changes.forEach((change) => {
      if (change.type === 'remove') {
        newNodesMap.delete(change.id);
      } else if (change.type === 'add') {
        newNodesMap.set(change.item.id, change.item);
      } else {
        const node = newNodesMap.get(change.id);
        if (node) {
          const updatedNode = newNodes.find((n) => n.id === change.id);
          if (updatedNode) {
            newNodesMap.set(change.id, updatedNode);
          }
        }
      }
    });

    set({ nodes: newNodes, nodesMap: newNodesMap });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  updateNodeData: (nodeId, newData) => {
    set((state) => {
      const nodeToUpdate = state.nodesMap.get(nodeId);
      if (!nodeToUpdate) {
        return state;
      }

      const updatedNode = { ...nodeToUpdate, data: { ...nodeToUpdate.data, ...newData } };

      const newNodesMap = new Map(state.nodesMap);
      newNodesMap.set(nodeId, updatedNode);

      const nodeIndex = state.nodes.findIndex((n) => n.id === nodeId);
      const newNodes = [...state.nodes];
      if (nodeIndex !== -1) {
        newNodes[nodeIndex] = updatedNode;
      }

      return { nodes: newNodes, nodesMap: newNodesMap };
    });
  },
  loadFlow: (flowData) => {
    const nodes = (flowData.nodes || []).map(fromSpecNode);
    set({
      nodes: nodes,
      edges: (flowData.edges || []).map(fromSpecEdge),
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
    set((state) => {
      const newNodes = [...state.nodes, newNode];
      const newNodesMap = new Map(state.nodesMap);
      newNodesMap.set(newNode.id, newNode);
      return { nodes: newNodes, nodesMap: newNodesMap };
    });
    return newNode;
  },
  duplicateNode: (nodeId) => {
    const { nodesMap } = get();
    const nodeToDuplicate = nodesMap.get(nodeId);
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

    set((state) => {
      const newNodes = [...state.nodes, newNode];
      const newNodesMap = new Map(state.nodesMap);
      newNodesMap.set(newNode.id, newNode);
      return { nodes: newNodes, nodesMap: newNodesMap };
    });
  },
}));

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
  position: specNode.position,
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
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
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
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      }),
    });
  },
  loadFlow: (flowData) => {
    set({
      nodes: (flowData.nodes || []).map(fromSpecNode),
      edges: (flowData.edges || []).map(fromSpecEdge),
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
    set({ nodes: [...get().nodes, newNode] });
    return newNode;
  },
  duplicateNode: (nodeId) => {
    const { nodes } = get();
    const nodeToDuplicate = nodes.find((n) => n.id === nodeId);
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
    set({ nodes: [...nodes, newNode] });
  },
}));

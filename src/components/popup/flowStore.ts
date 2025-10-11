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
import { FlowData } from '../../constants.js';

type FlowState = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  updateNodeData: (nodeId: string, data: object) => void;
  loadFlow: (flowData: FlowData) => void;
  getFlowData: () => FlowData;
  addNode: (node: Omit<Node, 'id'>) => Node;
  duplicateNode: (nodeId: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
};

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
    set({ nodes: flowData.nodes || [], edges: flowData.edges || [] });
  },
  getFlowData: () => {
    return { nodes: get().nodes, edges: get().edges };
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

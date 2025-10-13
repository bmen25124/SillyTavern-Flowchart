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
import { runMigrations } from '../../migrations.js';

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
    set({
      nodes: newNodes,
      nodesMap: new Map(newNodes.map((n) => [n.id, n])),
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
    set((state) => {
      const newNodes = state.nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      });
      return {
        nodes: newNodes,
        nodesMap: new Map(newNodes.map((n) => [n.id, n])),
      };
    });
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

    set((state) => {
      const newNodes = [...state.nodes, newNode];
      return {
        nodes: newNodes,
        nodesMap: new Map(newNodes.map((n) => [n.id, n])),
      };
    });
  },
}));

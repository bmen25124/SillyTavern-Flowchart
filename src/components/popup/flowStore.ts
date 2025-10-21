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
import { migrateFlowFormat, CURRENT_FLOW_VERSION } from '../../flow-migrations.js';
import { generateUUID } from '../../utils/uuid.js';
import { areFlowDataTypesCompatible } from '../../flow-types.js';
import { getHandleSpec } from '../../utils/handle-logic.js';

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
  loadFlow: (flowData: SpecFlow, flowVersion?: string) => void;
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

const cleanupEdges = (nodes: Node[], edges: Edge[]): Edge[] => {
  const nodesMap = new Map(nodes.map((n) => [n.id, n]));

  return edges.filter((edge) => {
    const sourceNode = nodesMap.get(edge.source);
    const targetNode = nodesMap.get(edge.target);

    if (!sourceNode || !targetNode) {
      return false;
    }

    // We get the full spec for each handle and check their type compatibility.
    const sourceHandleSpec = getHandleSpec(sourceNode, edge.sourceHandle ?? null, 'output', nodes, edges);
    const targetHandleSpec = getHandleSpec(targetNode, edge.targetHandle ?? null, 'input', nodes, edges);

    if (!sourceHandleSpec || !targetHandleSpec) {
      // If either handle dynamically disappeared, the edge is invalid.
      return false;
    }

    return areFlowDataTypesCompatible(sourceHandleSpec.type, targetHandleSpec.type);
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
        set((state) => {
          const newNodes = state.nodes.map((node) => {
            if (node.id === nodeId) {
              return { ...node, data: { ...node.data, ...newData } };
            }
            return node;
          });
          const cleanedEdges = cleanupEdges(newNodes, state.edges);
          return {
            nodes: newNodes,
            edges: cleanedEdges,
            nodesMap: new Map(newNodes.map((n) => [n.id, n])),
          };
        });
      },
      toggleNodeDisabled: (nodeIds) => {
        set((state) => {
          const nodesToToggle = new Set(nodeIds);
          const newNodes = state.nodes.map((node) => {
            if (nodesToToggle.has(node.id)) {
              return { ...node, data: { ...node.data, disabled: !node.data.disabled } };
            }
            return node;
          });
          return {
            nodes: newNodes,
            nodesMap: new Map(newNodes.map((n) => [n.id, n])),
          };
        });
      },
      loadFlow: (flowData, flowVersion?: string) => {
        // First migrate node data versions
        const nodeMigratedFlow = runMigrations(flowData);

        // Then migrate flow format if needed
        const formatMigratedFlow = migrateFlowFormat(nodeMigratedFlow, flowVersion, CURRENT_FLOW_VERSION);

        const nodes = (formatMigratedFlow.nodes || []).map(fromSpecNode);
        set({
          nodes: nodes,
          edges: (formatMigratedFlow.edges || []).map(fromSpecEdge),
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
        const newNode = { ...node, id: generateUUID() };
        if (newNode.type === 'ifNode' && newNode.data.conditions) {
          // @ts-ignore
          newNode.data.conditions = newNode.data.conditions.map((c: any) => ({
            ...c,
            id: generateUUID(),
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
          id: generateUUID(),
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
            id: generateUUID(),
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
          const newId = generateUUID();
          idMapping.set(node.id, newId);
          if (node.type === 'ifNode' && node.data.conditions) {
            // @ts-ignore
            node.data.conditions = node.data.conditions.map((c: any) => ({
              ...c,
              id: generateUUID(),
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
              id: generateUUID(),
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

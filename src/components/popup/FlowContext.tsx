import { FC, useState, useCallback, createContext, useContext, ReactNode } from 'react';
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  NodeRemoveChange,
} from '@xyflow/react';
import { settingsManager } from '../Settings.js';
import { FlowData } from '../../constants.js';
import { checkConnectionValidity } from '../../flow-types.js';

type FlowContextType = {
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
};

export const FlowContext = createContext<FlowContextType | null>(null);

export const FlowProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const settings = settingsManager.getSettings();
  const activeFlowData = settings.flows[settings.activeFlow] || { nodes: [], edges: [] };

  const [nodes, setNodes] = useState<Node[]>(() => structuredClone(activeFlowData.nodes));
  const [edges, setEdges] = useState<Edge[]>(() => structuredClone(activeFlowData.edges));

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const nodesToRemoveChanges = changes.filter((change): change is NodeRemoveChange => change.type === 'remove');

      if (nodesToRemoveChanges.length > 0) {
        const edgesToAdd: Edge[] = [];
        for (const { id: nodeIdToRemove } of nodesToRemoveChanges) {
          const incoming = edges.filter((e) => e.target === nodeIdToRemove);
          const outgoing = edges.filter((e) => e.source === nodeIdToRemove);

          if (incoming.length === 1 && outgoing.length === 1) {
            const inEdge = incoming[0];
            const outEdge = outgoing[0];

            const connection = {
              source: inEdge.source,
              sourceHandle: inEdge.sourceHandle || null,
              target: outEdge.target,
              targetHandle: outEdge.targetHandle || null,
            };

            if (checkConnectionValidity(connection, nodes)) {
              edgesToAdd.push({ ...connection, id: crypto.randomUUID() });
            }
          }
        }
        if (edgesToAdd.length > 0) {
          setEdges((eds) => [...eds, ...edgesToAdd]);
        }
      }

      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [nodes, edges, setNodes, setEdges],
  );

  const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge(connection, eds)), []);

  const updateNodeData = useCallback((nodeId: string, newData: object) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      }),
    );
  }, []);

  const loadFlow = useCallback((flowData: FlowData) => {
    setNodes(flowData.nodes || []);
    setEdges(flowData.edges || []);
  }, []);

  const getFlowData = useCallback((): FlowData => {
    return { nodes, edges };
  }, [nodes, edges]);

  const addNode = useCallback((node: Omit<Node, 'id'>): Node => {
    const newNode: Node = { ...node, id: crypto.randomUUID() };
    setNodes((nds) => [...nds, newNode]);
    return newNode;
  }, []);

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const nodeToDuplicate = nodes.find((n) => n.id === nodeId);
      if (!nodeToDuplicate) return;

      const newNode: Node = {
        ...structuredClone(nodeToDuplicate),
        id: crypto.randomUUID(),
        position: {
          x: nodeToDuplicate.position.x + 50,
          y: nodeToDuplicate.position.y + 50,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes],
  );

  const value = {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    updateNodeData,
    loadFlow,
    getFlowData,
    addNode,
    duplicateNode,
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
};

export const useFlow = () => {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlow must be used within a FlowProvider');
  }
  return context;
};

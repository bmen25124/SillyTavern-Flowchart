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
} from '@xyflow/react';
import { settingsManager } from '../Settings.js';
import { FlowData } from '../../constants.js';

type FlowContextType = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  updateNodeData: (nodeId: string, data: object) => void;
  loadFlow: (flowData: FlowData) => void;
  getFlowData: () => FlowData;
  addNode: (node: Omit<Node, 'id'>) => void;
  duplicateNode: (nodeId: string) => void;
};

export const FlowContext = createContext<FlowContextType | null>(null);

export const FlowProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const settings = settingsManager.getSettings();
  const activeFlowData = settings.flows[settings.activeFlow] || { nodes: [], edges: [] };

  const [nodes, setNodes] = useState<Node[]>(() => structuredClone(activeFlowData.nodes));
  const [edges, setEdges] = useState<Edge[]>(() => structuredClone(activeFlowData.edges));

  const onNodesChange: OnNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
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

  const addNode = useCallback((node: Omit<Node, 'id'>) => {
    const newNode: Node = { ...node, id: crypto.randomUUID() };
    setNodes((nds) => [...nds, newNode]);
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

import React, { FC, useState, useCallback, createContext, useContext, ReactNode } from 'react';
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

// Define initial data to demonstrate the new node
const initialNodes: Node[] = [
  {
    id: 'n1',
    type: 'starterNode',
    position: { x: 0, y: 0 },
    data: { selectedEventType: 'user_message_rendered' },
    width: 200,
    resizing: true,
  },
  {
    id: 'n2',
    type: 'ifElseNode',
    position: { x: 250, y: 0 },
    data: { code: 'input.messageId > 10' },
    resizing: true,
  },
];
const initialEdges: Edge[] = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];

type FlowContextType = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  updateNodeData: (nodeId: string, data: object) => void;
};

export const FlowContext = createContext<FlowContextType | null>(null);

export const FlowProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges],
  );

  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge(connection, eds)), [setEdges]);

  const updateNodeData = useCallback((nodeId: string, newData: object) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          // Merge new data with existing data to avoid overwriting other properties
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      }),
    );
  }, []);

  const value = { nodes, edges, onNodesChange, onEdgesChange, onConnect, updateNodeData };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
};

export const useFlow = () => {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlow must be used within a FlowProvider');
  }
  return context;
};

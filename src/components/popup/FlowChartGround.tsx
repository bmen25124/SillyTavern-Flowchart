import { FC, useCallback, useState, useEffect } from 'react';
import { settingsManager } from '../Settings.js';
import { useForceUpdate } from '../../hooks/useForceUpdate.js';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  EdgeChange,
  Edge,
  NodeChange,
  Connection,
  Node,
  Position,
} from '@xyflow/react';
import { StarterNode } from '../nodes/StarterNode.js';

const initialNodes: Node[] = [
  {
    id: 'n1',
    position: { x: 0, y: 0 },
    data: { selectedEventType: '' },
    type: 'starterNode',
    width: 200,
  },
  {
    id: 'n2',
    position: { x: 250, y: 0 },
    data: { label: 'Node 2' },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
];
const initialEdges = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];
const nodeTypes = {
  starterNode: StarterNode,
};

export const FlowChartGround: FC = () => {
  const forceUpdate = useForceUpdate();
  const settings = settingsManager.getSettings();

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    // @ts-ignore
    (changes: NodeChange<Node>[]) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (connection: Connection) => setEdges((edgesSnapshot) => addEdge(connection, edgesSnapshot)),
    [],
  );

  const onDataChange = useCallback((nodeId: string, value: string) => {
    setNodes((nodesSnapshot) =>
      nodesSnapshot.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, selectedEventType: value },
          };
        }

        return node;
      }),
    );
  }, []);

  useEffect(() => {
    setNodes((nodesSnapshot) =>
      nodesSnapshot.map((node) => {
        if (node.type === 'starterNode') {
          return {
            ...node,
            data: {
              ...node.data,
              onDataChange: onDataChange,
            },
          };
        }

        return node;
      }),
    );
  }, [onDataChange]);

  return (
    <div className="flowchart-popup-ground" style={{ width: '900px', height: '350px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
      />
    </div>
  );
};

import { FC, useMemo } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import { FlowProvider, useFlow } from './FlowContext.js';
import { StarterNode } from '../nodes/StarterNode.js';
import { IfElseNode } from '../nodes/IfElseNode.js';

const FlowCanvas: FC = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useFlow();

  const nodeTypes = useMemo(
    () => ({
      starterNode: StarterNode,
      ifElseNode: IfElseNode,
    }),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      colorMode="dark"
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
};

export const FlowChartGround: FC = () => {
  return (
    <FlowProvider>
      <div className="flowchart-popup-ground" style={{ width: '100%', height: '500px' }}>
        <FlowCanvas />
      </div>
    </FlowProvider>
  );
};

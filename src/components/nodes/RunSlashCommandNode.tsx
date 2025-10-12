import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node, useEdges } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { RunSlashCommandNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STTextarea } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type RunSlashCommandNodeProps = NodeProps<Node<RunSlashCommandNodeData>>;

export const RunSlashCommandNode: FC<RunSlashCommandNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as RunSlashCommandNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const edges = useEdges();

  if (!data) return null;

  const isConnected = (fieldId: string) => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);

  return (
    <BaseNode id={id} title="Run Slash Command" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="command"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Command</label>
          {!isConnected('command') && (
            <STTextarea
              className="nodrag"
              rows={3}
              value={data.command ?? ''}
              onChange={(e) => updateNodeData(id, { command: e.target.value })}
              placeholder='/echo "Hello World"'
            />
          )}
        </div>
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Result (Pipe)</span>
          <Handle
            type="source"
            position={Position.Right}
            id="result"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
      </div>
    </BaseNode>
  );
};

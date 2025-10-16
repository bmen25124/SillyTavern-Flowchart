import { FC } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';

export const UnknownNode: FC<NodeProps> = ({ id, data, selected }) => {
  const label = (data as any)?.label || 'Unknown Node';

  return (
    <div
      className={selected ? 'node-selected' : ''}
      style={{
        border: '1px solid #777',
        padding: '10px',
        background: '#333',
        fontSize: '12px',
        minWidth: 180,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <label>{label}</label>
      </div>
      <div style={{ color: '#ff6b6b', fontStyle: 'italic' }}>
        <p>Unknown node type</p>
        <p>This node cannot be executed</p>
      </div>
      <Handle type="target" position={Position.Left} id="input" />
      <Handle type="source" position={Position.Right} id="output" />
    </div>
  );
};

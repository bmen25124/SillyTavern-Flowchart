import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { EndNodeData } from './definition.js';

export type EndNodeProps = NodeProps<Node<EndNodeData>>;

export const EndNode: FC<EndNodeProps> = ({ id, selected }) => {
  return (
    <BaseNode id={id} title="End Flow" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <div style={{ padding: '10px 0', textAlign: 'center', color: '#aaa' }}>Execution stops here.</div>
    </BaseNode>
  );
};

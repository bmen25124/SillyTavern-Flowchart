import React, { FC } from 'react';
import { Handle, Position, useEdges, NodeProps, Node } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { CreateLorebookNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';

export type CreateLorebookNodeProps = NodeProps<Node<CreateLorebookNodeData>>;

export const CreateLorebookNode: FC<CreateLorebookNodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useFlow();
  const edges = useEdges();

  const isConnected = (fieldId: string) => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);

  return (
    <BaseNode id={id} title="Create Lorebook" selected={selected}>
      <div style={{ position: 'relative' }}>
        <Handle
          type="target"
          position={Position.Left}
          id="worldName"
          style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
        />
        <label style={{ marginLeft: '10px' }}>Lorebook Name</label>
        {!isConnected('worldName') && (
          <STInput
            className="nodrag"
            value={data.worldName ?? ''}
            onChange={(e) => updateNodeData(id, { worldName: e.target.value })}
          />
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

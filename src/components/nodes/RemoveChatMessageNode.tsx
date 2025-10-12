import React, { FC } from 'react';
import { Handle, Position, useEdges, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { RemoveChatMessageNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type RemoveChatMessageNodeProps = NodeProps<Node<RemoveChatMessageNodeData>>;

export const RemoveChatMessageNode: FC<RemoveChatMessageNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as RemoveChatMessageNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const edges = useEdges();

  if (!data) return null;

  const isConnected = (fieldId: string) => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);

  return (
    <BaseNode id={id} title="Remove Chat Message" selected={selected}>
      <div style={{ position: 'relative' }}>
        <Handle
          type="target"
          position={Position.Left}
          id="messageId"
          style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
        />
        <label style={{ marginLeft: '10px' }}>Message ID</label>
        {!isConnected('messageId') && (
          <STInput
            className="nodrag"
            type="number"
            value={data.messageId ?? ''}
            onChange={(e) => updateNodeData(id, { messageId: Number(e.target.value) })}
          />
        )}
      </div>
    </BaseNode>
  );
};

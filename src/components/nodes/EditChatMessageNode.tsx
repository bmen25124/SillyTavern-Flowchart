import React, { FC } from 'react';
import { Handle, Position, useEdges, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { EditChatMessageNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STTextarea } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type EditChatMessageNodeProps = NodeProps<Node<EditChatMessageNodeData>>;

export const EditChatMessageNode: FC<EditChatMessageNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as EditChatMessageNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const edges = useEdges();

  if (!data) return null;

  const isConnected = (fieldId: string) => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);

  return (
    <BaseNode id={id} title="Edit Chat Message" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="message"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>New Message Content</label>
          {!isConnected('message') && (
            <STTextarea
              className="nodrag"
              rows={3}
              value={data.message ?? ''}
              onChange={(e) => updateNodeData(id, { message: e.target.value })}
            />
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="messageObject" />
    </BaseNode>
  );
};

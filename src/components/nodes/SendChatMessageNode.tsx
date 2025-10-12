import React, { FC } from 'react';
import { Handle, Position, useEdges, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { SendChatMessageNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STSelect, STTextarea } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type SendChatMessageNodeProps = NodeProps<Node<SendChatMessageNodeData>>;

export const SendChatMessageNode: FC<SendChatMessageNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as SendChatMessageNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const edges = useEdges();

  if (!data) return null;

  const isConnected = (fieldId: string) => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);

  return (
    <BaseNode id={id} title="Send Chat Message" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="message"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Message Content</label>
          {!isConnected('message') && (
            <STTextarea
              className="nodrag"
              rows={3}
              value={data.message ?? ''}
              onChange={(e) => updateNodeData(id, { message: e.target.value })}
            />
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="role"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Role</label>
          {!isConnected('role') && (
            <STSelect
              className="nodrag"
              value={data.role}
              onChange={(e) => updateNodeData(id, { role: e.target.value as any })}
            >
              <option value="assistant">Assistant</option>
              <option value="user">User</option>
              <option value="system">System</option>
            </STSelect>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="name"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Name (Optional)</label>
          {!isConnected('name') && (
            <STInput
              className="nodrag"
              value={data.name ?? ''}
              onChange={(e) => updateNodeData(id, { name: e.target.value })}
            />
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="messageId" />
    </BaseNode>
  );
};

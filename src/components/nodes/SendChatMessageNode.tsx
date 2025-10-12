import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { SendChatMessageNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STSelect, STTextarea } from 'sillytavern-utils-lib/components';
import { useIsConnected } from '../../hooks/useIsConnected.js';

export type SendChatMessageNodeProps = NodeProps<Node<SendChatMessageNodeData>>;

export const SendChatMessageNode: FC<SendChatMessageNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as SendChatMessageNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isMessageConnected = useIsConnected(id, 'message');
  const isRoleConnected = useIsConnected(id, 'role');
  const isNameConnected = useIsConnected(id, 'name');

  if (!data) return null;

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
          {!isMessageConnected && (
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
          {!isRoleConnected && (
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
          {!isNameConnected && (
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

import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { EditChatMessageNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STTextarea } from 'sillytavern-utils-lib/components';
import { useIsConnected } from '../../hooks/useIsConnected.js';

export type EditChatMessageNodeProps = NodeProps<Node<EditChatMessageNodeData>>;

export const EditChatMessageNode: FC<EditChatMessageNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as EditChatMessageNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isIdConnected = useIsConnected(id, 'messageId');
  const isMessageConnected = useIsConnected(id, 'message');

  if (!data) return null;

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
          {!isIdConnected && (
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
          {!isMessageConnected && (
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

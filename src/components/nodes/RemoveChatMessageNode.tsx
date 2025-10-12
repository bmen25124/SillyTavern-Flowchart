import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { RemoveChatMessageNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { useIsConnected } from '../../hooks/useIsConnected.js';

export type RemoveChatMessageNodeProps = NodeProps<Node<RemoveChatMessageNodeData>>;

export const RemoveChatMessageNode: FC<RemoveChatMessageNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as RemoveChatMessageNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isIdConnected = useIsConnected(id, 'messageId');

  if (!data) return null;

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
        {!isIdConnected && (
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

import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { GetChatMessageNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { useIsConnected } from '../../hooks/useIsConnected.js';

export type GetChatMessageNodeProps = NodeProps<Node<GetChatMessageNodeData>>;

const outputFields = ['id', 'name', 'mes', 'is_user', 'is_system'] as const;

export const GetChatMessageNode: FC<GetChatMessageNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetChatMessageNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isMessageIdConnected = useIsConnected(id, 'messageId');

  if (!data) return null;

  return (
    <BaseNode id={id} title="Get Chat Message" selected={selected}>
      <div style={{ position: 'relative' }}>
        <Handle
          type="target"
          position={Position.Left}
          id="messageId"
          style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
        />
        <label style={{ marginLeft: '10px' }}>Message ID (e.g., last, first, 123)</label>
        {!isMessageIdConnected && (
          <STInput
            className="nodrag"
            value={data.messageId ?? ''}
            onChange={(e) => updateNodeData(id, { messageId: e.target.value })}
            placeholder="last"
          />
        )}
      </div>

      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span>Full Message Object</span>
          <Handle
            type="source"
            position={Position.Right}
            id="result"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
        {outputFields.map((field) => (
          <div
            key={field}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}
          >
            <span style={{ textTransform: 'capitalize' }}>{field.replace('_', ' ')}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={field}
              style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
            />
          </div>
        ))}
      </div>
    </BaseNode>
  );
};

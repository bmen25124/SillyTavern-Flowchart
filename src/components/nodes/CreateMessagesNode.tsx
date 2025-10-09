import React, { FC } from 'react';
import { Handle, Position, useEdges } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { CreateMessagesNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STConnectionProfileSelect, STInput } from 'sillytavern-utils-lib/components';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';

export type CreateMessagesNodeProps = {
  id: string;
  data: CreateMessagesNodeData;
};

export const CreateMessagesNode: FC<CreateMessagesNodeProps> = ({ id, data }) => {
  const { updateNodeData } = useFlow();
  const edges = useEdges();

  const isProfileIdConnected = edges.some((edge) => edge.target === id && edge.targetHandle === 'profileId');
  const isLastMessageIdConnected = edges.some((edge) => edge.target === id && edge.targetHandle === 'lastMessageId');

  const handleProfileChange = (profile?: ConnectionProfile) => {
    updateNodeData(id, { profileId: profile?.id || '' });
  };

  const handleLastMessageIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    updateNodeData(id, { lastMessageId: value === '' ? undefined : Number(value) });
  };

  return (
    <BaseNode id={id} title="Create Messages">
      <div style={{ width: 200, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="profileId"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Connection Profile</label>
          {!isProfileIdConnected && (
            <STConnectionProfileSelect initialSelectedProfileId={data.profileId} onChange={handleProfileChange} />
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="lastMessageId"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Last Message ID (Optional)</label>
          {!isLastMessageIdConnected && (
            <STInput className="nodrag" type="number" value={data.lastMessageId} onChange={handleLastMessageIdChange} />
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

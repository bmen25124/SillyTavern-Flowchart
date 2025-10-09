import React, { FC } from 'react';
import { Handle, Position } from '@xyflow/react';
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

  const handleProfileChange = (profile?: ConnectionProfile) => {
    updateNodeData(id, { profileId: profile?.id || '' });
  };

  const handleLastMessageIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    updateNodeData(id, { lastMessageId: value === '' ? undefined : Number(value) });
  };

  return (
    <BaseNode id={id} title="Create Messages">
      <Handle type="target" position={Position.Left} />
      <div style={{ width: 200 }}>
        <label>Connection Profile</label>
        <STConnectionProfileSelect initialSelectedProfileId={data.profileId} onChange={handleProfileChange} />
        <label style={{ marginTop: '10px', display: 'block' }}>Last Message ID (Optional)</label>
        <STInput type="number" value={data.lastMessageId} onChange={handleLastMessageIdChange} />
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

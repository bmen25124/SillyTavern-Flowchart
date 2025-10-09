import React, { FC } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { ProfileIdNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STConnectionProfileSelect } from 'sillytavern-utils-lib/components';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';

export type ProfileIdNodeProps = {
  id: string;
  data: ProfileIdNodeData;
};

export const ProfileIdNode: FC<ProfileIdNodeProps> = ({ id, data }) => {
  const { updateNodeData } = useFlow();

  const handleProfileChange = (profile?: ConnectionProfile) => {
    updateNodeData(id, { profileId: profile?.id || '' });
  };

  return (
    <BaseNode id={id} title="Profile ID">
      <div style={{ width: 200 }}>
        <label>Connection Profile</label>
        <STConnectionProfileSelect initialSelectedProfileId={data.profileId} onChange={handleProfileChange} />
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

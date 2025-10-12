import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { ProfileIdNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STConnectionProfileSelect } from 'sillytavern-utils-lib/components';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';

export type ProfileIdNodeProps = NodeProps<Node<ProfileIdNodeData>>;

export const ProfileIdNode: FC<ProfileIdNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as ProfileIdNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  const handleProfileChange = (profile?: ConnectionProfile) => {
    updateNodeData(id, { profileId: profile?.id || '' });
  };

  return (
    <BaseNode id={id} title="Profile ID" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <div>
        <label>Connection Profile</label>
        <STConnectionProfileSelect initialSelectedProfileId={data.profileId} onChange={handleProfileChange} />
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

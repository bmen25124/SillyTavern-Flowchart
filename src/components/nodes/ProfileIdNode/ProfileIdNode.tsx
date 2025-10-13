import { FC, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { ProfileIdNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STConnectionProfileSelect } from 'sillytavern-utils-lib/components';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';

export type ProfileIdNodeProps = NodeProps<Node<ProfileIdNodeData>>;

const fields = [
  createFieldConfig({
    id: 'profileId',
    label: 'Connection Profile',
    component: STConnectionProfileSelect,
    props: {
      onChange: (profile?: ConnectionProfile) => {}, // This will be replaced in the component
    },
  }),
];

export const ProfileIdNode: FC<ProfileIdNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as ProfileIdNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  const dynamicFields = useMemo(
    () =>
      fields.map((field) => {
        if (field.id === 'profileId') {
          return {
            ...field,
            props: {
              ...field.props,
              initialSelectedProfileId: data?.profileId,
              onChange: (profile?: ConnectionProfile) => {
                updateNodeData(id, { profileId: profile?.id || '' });
              },
            },
          };
        }
        return field;
      }),
    [data?.profileId, updateNodeData, id],
  );

  if (!data) return null;

  return (
    <BaseNode id={id} title="Profile ID" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={dynamicFields} data={data} updateNodeData={updateNodeData} />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

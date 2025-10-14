import { FC, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { ProfileIdNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STConnectionProfileSelect } from 'sillytavern-utils-lib/components';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { useIsConnected } from '../../../hooks/useIsConnected.js';
import { FlowDataTypeColors } from '../../../flow-types.js';

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

export const ProfileIdNode: FC<ProfileIdNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as ProfileIdNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isInputConnected = useIsConnected(id, 'main');

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
      {!isInputConnected ? (
        <NodeFieldRenderer
          nodeId={id}
          nodeType={type}
          fields={dynamicFields}
          data={data}
          updateNodeData={updateNodeData}
        />
      ) : (
        <div style={{ position: 'relative', padding: '5px 0' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="main"
            style={{ top: '50%', transform: 'translateY(-50%)', backgroundColor: FlowDataTypeColors.any }}
          />
          <label style={{ marginLeft: '10px' }}>Value</label>
          <span className="handle-label">(any)</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} id="main" />
    </BaseNode>
  );
};

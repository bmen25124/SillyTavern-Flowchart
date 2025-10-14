import { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { ProfileIdNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STConnectionProfileSelect } from 'sillytavern-utils-lib/components';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type ProfileIdNodeProps = NodeProps<Node<ProfileIdNodeData>>;

export const ProfileIdNode: FC<ProfileIdNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as ProfileIdNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  const fields = useMemo(
    () => [
      createFieldConfig({
        id: 'main',
        label: 'Connection Profile',
        component: STConnectionProfileSelect,
        props: {
          initialSelectedProfileId: data?.profileId,
        },
        customChangeHandler: (profile?: ConnectionProfile) => {
          updateNodeData(id, { profileId: profile?.id || '' });
        },
      }),
    ],
    [data?.profileId, id, updateNodeData],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Profile ID" selected={selected}>
      <NodeHandleRenderer
        nodeId={id}
        definition={definition}
        type="input"
        fields={fields}
        data={data}
        updateNodeData={updateNodeData}
      />

      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};

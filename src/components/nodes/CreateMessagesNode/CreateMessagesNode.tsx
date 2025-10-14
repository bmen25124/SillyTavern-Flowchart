import React, { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { CreateMessagesNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STConnectionProfileSelect, STInput } from 'sillytavern-utils-lib/components';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type CreateMessagesNodeProps = NodeProps<Node<CreateMessagesNodeData>>;

export const CreateMessagesNode: FC<CreateMessagesNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as CreateMessagesNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  const fields = useMemo(
    () => [
      createFieldConfig({
        id: 'profileId',
        label: 'Connection Profile',
        component: STConnectionProfileSelect,
        props: {
          initialSelectedProfileId: data?.profileId,
        },
        customChangeHandler: (profile?: ConnectionProfile) => {
          updateNodeData(id, { profileId: profile?.id || '' });
        },
      }),
      createFieldConfig({
        id: 'startMessageId',
        label: 'Start Message ID (Optional)',
        component: STInput,
        props: { type: 'number' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) =>
          e.target.value === '' ? undefined : Number(e.target.value),
      }),
      createFieldConfig({
        id: 'endMessageId',
        label: 'End Message ID (Optional)',
        component: STInput,
        props: { type: 'number' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) =>
          e.target.value === '' ? undefined : Number(e.target.value),
      }),
      createFieldConfig({
        id: 'ignoreCharacterFields',
        label: 'Ignore Character Fields',
        component: STInput,
        props: { type: 'checkbox' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => e.target.checked,
      }),
      createFieldConfig({
        id: 'ignoreAuthorNote',
        label: 'Ignore Author Note',
        component: STInput,
        props: { type: 'checkbox' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => e.target.checked,
      }),
      createFieldConfig({
        id: 'ignoreWorldInfo',
        label: 'Ignore World Info',
        component: STInput,
        props: { type: 'checkbox' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => e.target.checked,
      }),
    ],
    [data?.profileId, id, updateNodeData],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Create Messages" selected={selected}>
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

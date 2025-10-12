import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { EditCharacterNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { useIsConnected } from '../../hooks/useIsConnected.js';

export type EditCharacterNodeProps = NodeProps<Node<EditCharacterNodeData>>;

const fields = [
  { id: 'name', label: 'New Name', component: STInput, props: { type: 'text' } },
  { id: 'description', label: 'Description', component: STTextarea, props: { rows: 2 } },
  { id: 'first_mes', label: 'First Message', component: STTextarea, props: { rows: 2 } },
  { id: 'scenario', label: 'Scenario', component: STTextarea, props: { rows: 2 } },
  { id: 'personality', label: 'Personality', component: STTextarea, props: { rows: 2 } },
  { id: 'mes_example', label: 'Message Examples', component: STTextarea, props: { rows: 2 } },
  { id: 'tags', label: 'Tags (comma-separated)', component: STInput, props: { type: 'text' } },
] as const;

export const EditCharacterNode: FC<EditCharacterNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as EditCharacterNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isAvatarConnected = useIsConnected(id, 'characterAvatar');
  const { characters } = SillyTavern.getContext();

  if (!data) return null;

  return (
    <BaseNode id={id} title="Edit Character" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="characterAvatar"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Character to Edit</label>
          {!isAvatarConnected && (
            <STFancyDropdown
              value={[data.characterAvatar ?? '']}
              onChange={(e) => updateNodeData(id, { characterAvatar: e[0] })}
              multiple={false}
              items={characters.map((c) => ({ value: c.avatar, label: c.name }))}
              inputClasses="nodrag"
              containerClasses="nodrag"
              closeOnSelect={true}
              enableSearch={true}
            />
          )}
        </div>
        <hr />
        {fields.map((field) => (
          <FieldInput key={field.id} id={id} field={field} data={data} updateNodeData={updateNodeData} />
        ))}
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

const FieldInput: FC<{
  id: string;
  field: (typeof fields)[number];
  data: EditCharacterNodeData;
  updateNodeData: (id: string, data: object) => void;
}> = React.memo(({ id, field, data, updateNodeData }) => {
  const isFieldConnected = useIsConnected(id, field.id);
  return (
    <div key={field.id} style={{ position: 'relative' }}>
      <Handle
        type="target"
        position={Position.Left}
        id={field.id}
        style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
      />
      <label style={{ marginLeft: '10px' }}>{field.label}</label>
      {!isFieldConnected &&
        React.createElement(field.component as any, {
          className: 'nodrag',
          value: data[field.id] ?? '',
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            updateNodeData(id, { [field.id]: e.target.value }),
          ...field.props,
        })}
    </div>
  );
});

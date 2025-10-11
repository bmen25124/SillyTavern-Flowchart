import React, { FC, useMemo } from 'react';
import { Handle, Position, useEdges, NodeProps, Node } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { EditCharacterNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { Character } from 'sillytavern-utils-lib/types';

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

export const EditCharacterNode: FC<EditCharacterNodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useFlow();
  const edges = useEdges();
  const { characters } = SillyTavern.getContext();

  const isConnected = (fieldId: string) => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);

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
          {!isConnected('characterAvatar') && (
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
          <div key={field.id} style={{ position: 'relative' }}>
            <Handle
              type="target"
              position={Position.Left}
              id={field.id}
              style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
            />
            <label style={{ marginLeft: '10px' }}>{field.label}</label>
            {!isConnected(field.id) &&
              React.createElement(field.component as any, {
                className: 'nodrag',
                value: data[field.id] ?? '',
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  updateNodeData(id, { [field.id]: e.target.value }),
                ...field.props,
              })}
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

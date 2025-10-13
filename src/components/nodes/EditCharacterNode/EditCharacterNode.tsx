import React, { FC, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { EditCharacterNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';

export type EditCharacterNodeProps = NodeProps<Node<EditCharacterNodeData>>;

const fields = [
  createFieldConfig({
    id: 'characterAvatar',
    label: 'Character to Edit',
    component: STFancyDropdown,
    props: {
      multiple: false,
      inputClasses: 'nodrag',
      containerClasses: 'nodrag',
      closeOnSelect: true,
      enableSearch: true,
    },
    getValueFromEvent: (e: string[]) => e[0],
    formatValue: (value) => [value ?? ''],
  }),
  createFieldConfig({ id: 'name', label: 'New Name', component: STInput, props: { type: 'text' } }),
  createFieldConfig({ id: 'description', label: 'Description', component: STTextarea, props: { rows: 2 } }),
  createFieldConfig({ id: 'first_mes', label: 'First Message', component: STTextarea, props: { rows: 2 } }),
  createFieldConfig({ id: 'scenario', label: 'Scenario', component: STTextarea, props: { rows: 2 } }),
  createFieldConfig({ id: 'personality', label: 'Personality', component: STTextarea, props: { rows: 2 } }),
  createFieldConfig({ id: 'mes_example', label: 'Message Examples', component: STTextarea, props: { rows: 2 } }),
  createFieldConfig({ id: 'tags', label: 'Tags (comma-separated)', component: STInput, props: { type: 'text' } }),
];

export const EditCharacterNode: FC<EditCharacterNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as EditCharacterNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const { characters } = SillyTavern.getContext();

  const characterOptions = useMemo(() => characters.map((c) => ({ value: c.avatar, label: c.name })), [characters]);

  const dynamicFields = useMemo(
    () =>
      fields.map((field) => {
        if (field.id === 'characterAvatar') {
          return { ...field, props: { ...field.props, items: characterOptions } };
        }
        return field;
      }),
    [characterOptions],
  );

  if (!data) return null;

  return (
    <BaseNode id={id} title="Edit Character" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={dynamicFields} data={data} updateNodeData={updateNodeData} />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

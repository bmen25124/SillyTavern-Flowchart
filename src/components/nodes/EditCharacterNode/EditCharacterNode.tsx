import { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { EditCharacterNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type EditCharacterNodeProps = NodeProps<Node<EditCharacterNodeData>>;

export const EditCharacterNode: FC<EditCharacterNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as EditCharacterNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const { characters } = SillyTavern.getContext();
  const definition = registrator.nodeDefinitionMap.get(type);

  const characterOptions = useMemo(() => characters.map((c) => ({ value: c.avatar, label: c.name })), [characters]);

  const fields = useMemo(
    () => [
      createFieldConfig({
        id: 'characterAvatar',
        label: 'Character to Edit',
        component: STFancyDropdown,
        props: {
          items: characterOptions,
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
    ],
    [characterOptions],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Edit Character" selected={selected}>
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

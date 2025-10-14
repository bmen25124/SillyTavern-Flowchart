import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { CreateCharacterNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STTextarea } from 'sillytavern-utils-lib/components';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type CreateCharacterNodeProps = NodeProps<Node<CreateCharacterNodeData>>;

const fields = [
  createFieldConfig({ id: 'name', label: 'Name', component: STInput, props: { type: 'text' } }),
  createFieldConfig({ id: 'description', label: 'Description', component: STTextarea, props: { rows: 2 } }),
  createFieldConfig({ id: 'first_mes', label: 'First Message', component: STTextarea, props: { rows: 2 } }),
  createFieldConfig({ id: 'scenario', label: 'Scenario', component: STTextarea, props: { rows: 2 } }),
  createFieldConfig({ id: 'personality', label: 'Personality', component: STTextarea, props: { rows: 2 } }),
  createFieldConfig({ id: 'mes_example', label: 'Message Examples', component: STTextarea, props: { rows: 2 } }),
  createFieldConfig({ id: 'tags', label: 'Tags (comma-separated)', component: STInput, props: { type: 'text' } }),
];

export const CreateCharacterNode: FC<CreateCharacterNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as CreateCharacterNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Create Character" selected={selected}>
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

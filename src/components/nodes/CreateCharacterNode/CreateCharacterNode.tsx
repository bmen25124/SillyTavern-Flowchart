import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { CreateCharacterNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STTextarea } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';

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

  if (!data) return null;

  return (
    <BaseNode id={id} title="Create Character" selected={selected}>
      <NodeFieldRenderer nodeId={id} nodeType={type} fields={fields} data={data} updateNodeData={updateNodeData} />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

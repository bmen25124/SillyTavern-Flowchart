import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { CreateLorebookNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';

export type CreateLorebookNodeProps = NodeProps<Node<CreateLorebookNodeData>>;

const fields = [
  createFieldConfig({ id: 'worldName', label: 'Lorebook Name', component: STInput, props: { type: 'text' } }),
];

export const CreateLorebookNode: FC<CreateLorebookNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as CreateLorebookNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Create Lorebook" selected={selected}>
      <NodeFieldRenderer nodeId={id} nodeType={type} fields={fields} data={data} updateNodeData={updateNodeData} />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

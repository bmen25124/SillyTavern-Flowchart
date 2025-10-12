import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { NumberNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from './NodeFieldRenderer.js';
import { createFieldConfig } from './fieldConfig.js';

export type NumberNodeProps = NodeProps<Node<NumberNodeData>>;

const fields = [
  createFieldConfig({
    id: 'value',
    label: 'Value',
    component: STInput,
    props: { type: 'number' },
    getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => (e.target.value === '' ? 0 : Number(e.target.value)),
  }),
];

export const NumberNode: FC<NumberNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as NumberNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Number" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={fields} data={data} updateNodeData={updateNodeData} />
      <Handle type="source" position={Position.Right} id="value" />
    </BaseNode>
  );
};

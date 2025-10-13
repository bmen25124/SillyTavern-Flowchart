import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { NumberNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { schemaToText } from '../../../utils/schema-inspector.js';
import { registrator } from '../registrator.js';

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
  const definition = registrator.nodeDefinitionMap.get('numberNode');
  const resultHandle = definition?.handles.outputs.find((h) => h.id === 'value');
  const schemaText = resultHandle?.schema ? schemaToText(resultHandle.schema) : resultHandle?.type;

  if (!data) return null;

  return (
    <BaseNode id={id} title="Number" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={fields} data={data} updateNodeData={updateNodeData} />
      <div title={schemaText}>
        <Handle type="source" position={Position.Right} id="value" />
      </div>
    </BaseNode>
  );
};

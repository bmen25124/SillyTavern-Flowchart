import React, { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { NumberNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

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

export const NumberNode: FC<NumberNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as NumberNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Number" selected={selected}>
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

import React, { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { BooleanNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STSelect } from 'sillytavern-utils-lib/components';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type BooleanNodeProps = NodeProps<Node<BooleanNodeData>>;

const fields = [
  createFieldConfig({
    id: 'value',
    label: 'Value',
    component: STSelect,
    props: {
      children: (
        <>
          <option value="true">True</option>
          <option value="false">False</option>
        </>
      ),
    },
    getValueFromEvent: (e: React.ChangeEvent<HTMLSelectElement>) => e.target.value === 'true',
    formatValue: (value: boolean) => String(value),
  }),
];

export const BooleanNode: FC<BooleanNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as BooleanNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Boolean" selected={selected}>
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

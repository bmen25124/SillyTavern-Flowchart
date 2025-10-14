import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { useFlowStore } from '../../popup/flowStore.js';
import { TypeConverterNodeData } from './definition.js';
import { STSelect } from 'sillytavern-utils-lib/components';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type TypeConverterNodeProps = NodeProps<Node<TypeConverterNodeData>>;

const fields = [
  createFieldConfig({
    id: 'targetType',
    label: 'Convert To',
    component: STSelect,
    props: {
      children: (
        <>
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="object">Object (from JSON string)</option>
          <option value="array">Array (from JSON string)</option>
        </>
      ),
    },
  }),
];

export const TypeConverterNode: FC<TypeConverterNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as TypeConverterNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Type Converter" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeHandleRenderer
          nodeId={id}
          definition={definition}
          type="input"
          fields={fields}
          data={data}
          updateNodeData={updateNodeData}
        />
        <div style={{ borderTop: '1px solid #555', paddingTop: '10px', marginTop: '5px' }}>
          <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
        </div>
      </div>
    </BaseNode>
  );
};

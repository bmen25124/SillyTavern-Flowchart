import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { useFlowStore } from '../../popup/flowStore.js';
import { TypeConverterNodeData } from './definition.js';
import { STSelect } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../registrator.js';
import { schemaToText } from '../../../utils/schema-inspector.js';

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

export const TypeConverterNode: FC<TypeConverterNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as TypeConverterNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('typeConverterNode');
  const resultHandle = definition?.handles.outputs.find((h) => h.id === 'result');
  const schemaText = resultHandle?.schema ? schemaToText(resultHandle.schema) : resultHandle?.type;

  if (!data) return null;

  return (
    <BaseNode id={id} title="Type Converter" selected={selected}>
      <Handle type="target" position={Position.Left} id="value" />
      <NodeFieldRenderer nodeId={id} fields={fields} data={data} updateNodeData={updateNodeData} />
      <div
        style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}
        title={schemaText}
      >
        <span>Result</span>
        <Handle
          type="source"
          position={Position.Right}
          id="result"
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    </BaseNode>
  );
};

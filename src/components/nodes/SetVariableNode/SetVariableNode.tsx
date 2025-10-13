import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { SetVariableNodeData } from '../../../flow-types.js';
import { BaseNode } from '../BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../registrator.js';
import { schemaToText } from '../../../utils/schema-inspector.js';

export type SetVariableNodeProps = NodeProps<Node<SetVariableNodeData>>;

const fields = [
  createFieldConfig({
    id: 'variableName',
    label: 'Variable Name',
    component: STInput,
    props: { type: 'text' },
  }),
];

export const SetVariableNode: FC<SetVariableNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as SetVariableNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('setVariableNode');
  const resultHandle = definition?.handles.outputs.find((h) => h.id === 'value');
  const schemaText = resultHandle?.schema ? schemaToText(resultHandle.schema) : resultHandle?.type;

  if (!data) return null;

  return (
    <BaseNode id={id} title="Set Variable" selected={selected}>
      <Handle type="target" position={Position.Left} id="value" style={{ top: '15%' }} />

      <NodeFieldRenderer nodeId={id} fields={fields} data={data} updateNodeData={updateNodeData} />

      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}
        title={schemaText}
      >
        <span>Value (Passthrough)</span>
        <Handle type="source" position={Position.Right} id="value" />
      </div>
    </BaseNode>
  );
};

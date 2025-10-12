import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { SetVariableNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from './NodeFieldRenderer.js';
import { createFieldConfig } from './fieldConfig.js';

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

  if (!data) return null;

  return (
    <BaseNode id={id} title="Set Variable" selected={selected}>
      <Handle type="target" position={Position.Left} id="value" style={{ top: '15%' }} />

      <NodeFieldRenderer nodeId={id} fields={fields} data={data} updateNodeData={updateNodeData} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <span>Value (Passthrough)</span>
        <Handle type="source" position={Position.Right} id="value" />
      </div>
    </BaseNode>
  );
};

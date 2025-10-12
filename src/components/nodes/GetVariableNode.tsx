import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { GetVariableNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from './NodeFieldRenderer.js';
import { createFieldConfig } from './fieldConfig.js';

export type GetVariableNodeProps = NodeProps<Node<GetVariableNodeData>>;

const fields = [
  createFieldConfig({
    id: 'variableName',
    label: 'Variable Name',
    component: STInput,
    props: { type: 'text' },
  }),
  createFieldConfig({
    id: 'scope',
    label: 'Scope',
    component: STSelect,
    props: {
      children: (
        <>
          <option value="Execution">Flow Execution</option>
          <option value="Session">SillyTavern Session</option>
        </>
      ),
    },
  }),
];

export const GetVariableNode: FC<GetVariableNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetVariableNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Get Variable" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={fields} data={data} updateNodeData={updateNodeData} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <span>Value</span>
        <Handle type="source" position={Position.Right} id="value" />
      </div>
    </BaseNode>
  );
};

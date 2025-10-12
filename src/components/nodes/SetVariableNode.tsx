import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { SetVariableNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type SetVariableNodeProps = NodeProps<Node<SetVariableNodeData>>;

export const SetVariableNode: FC<SetVariableNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as SetVariableNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );

  if (!data) return null;

  return (
    <BaseNode id={id} title="Set Variable" selected={selected}>
      <Handle type="target" position={Position.Left} id="value" style={{ top: '25%' }} />
      <div>
        <label>Variable Name</label>
        <STInput
          className="nodrag"
          value={data.variableName}
          onChange={(e) => updateNodeData(id, { variableName: e.target.value })}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <span>Value (Passthrough)</span>
        <Handle type="source" position={Position.Right} id="value" />
      </div>
    </BaseNode>
  );
};

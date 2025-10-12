import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { NumberNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type NumberNodeProps = NodeProps<Node<NumberNodeData>>;

export const NumberNode: FC<NumberNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as NumberNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );

  if (!data) return null;

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    updateNodeData(id, { value: value === '' ? 0 : Number(value) });
  };

  return (
    <BaseNode id={id} title="Number" selected={selected}>
      <Handle type="target" position={Position.Left} id="value" />
      <div>
        <label>Value</label>
        <STInput className="nodrag" type="number" value={data.value} onChange={handleValueChange} />
      </div>
      <Handle type="source" position={Position.Right} id="value" />
    </BaseNode>
  );
};

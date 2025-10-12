import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { StringNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type StringNodeProps = NodeProps<Node<StringNodeData>>;

export const StringNode: FC<StringNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as StringNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );

  if (!data) return null;

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { value: event.target.value });
  };

  return (
    <BaseNode id={id} title="String" selected={selected}>
      <Handle type="target" position={Position.Left} id="value" />
      <div>
        <label>Value</label>
        <STInput className="nodrag" value={data.value} onChange={handleValueChange} />
      </div>
      <Handle type="source" position={Position.Right} id="value" />
    </BaseNode>
  );
};

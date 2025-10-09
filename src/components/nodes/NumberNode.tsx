import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { NumberNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';

export type NumberNodeProps = NodeProps<Node<NumberNodeData>>;

export const NumberNode: FC<NumberNodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useFlow();

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    updateNodeData(id, { value: value === '' ? 0 : Number(value) });
  };

  return (
    <BaseNode id={id} title="Number" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <div>
        <label>Value</label>
        <STInput className="nodrag" type="number" value={data.value} onChange={handleValueChange} />
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

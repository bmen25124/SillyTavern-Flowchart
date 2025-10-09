import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { StringNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';

export type StringNodeProps = NodeProps<Node<StringNodeData>>;

export const StringNode: FC<StringNodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useFlow();

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { value: event.target.value });
  };

  return (
    <BaseNode id={id} title="String" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <div>
        <label>Value</label>
        <STInput className="nodrag" value={data.value} onChange={handleValueChange} />
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

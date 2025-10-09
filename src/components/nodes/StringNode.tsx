import React, { FC } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { StringNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';

export type StringNodeProps = {
  id: string;
  data: StringNodeData;
};

export const StringNode: FC<StringNodeProps> = ({ id, data }) => {
  const { updateNodeData } = useFlow();

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { value: event.target.value });
  };

  return (
    <BaseNode id={id} title="String">
      <Handle type="target" position={Position.Left} />
      <div style={{ width: 200 }}>
        <label>Value</label>
        <STInput className="nodrag" value={data.value} onChange={handleValueChange} />
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

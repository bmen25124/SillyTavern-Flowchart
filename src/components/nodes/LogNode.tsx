import React from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { LogNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';

export type LogNodeProps = NodeProps<Node<LogNodeData>>;

export const LogNode: React.FC<LogNodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useFlow();

  return (
    <BaseNode id={id} title="Log Message" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <div>
        <label>Log Prefix</label>
        <STInput
          className="nodrag"
          value={data.prefix}
          onChange={(e) => updateNodeData(id, { prefix: e.target.value })}
          placeholder="Prefix for the log message"
        />
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

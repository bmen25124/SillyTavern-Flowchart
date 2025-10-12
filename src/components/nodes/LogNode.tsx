import React from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { LogNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';

export type LogNodeProps = NodeProps<Node<LogNodeData>>;

export const LogNode: React.FC<LogNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as LogNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Log Message" selected={selected}>
      <Handle type="target" position={Position.Left} id="value" />
      <div>
        <label>Log Prefix</label>
        <STInput
          className="nodrag"
          value={data.prefix}
          onChange={(e) => updateNodeData(id, { prefix: e.target.value })}
          placeholder="Prefix for the log message"
        />
      </div>
      <Handle type="source" position={Position.Right} id="value" />
    </BaseNode>
  );
};

import React from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { LogNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type LogNodeProps = NodeProps<Node<LogNodeData>>;

export const LogNode: React.FC<LogNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as LogNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );

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

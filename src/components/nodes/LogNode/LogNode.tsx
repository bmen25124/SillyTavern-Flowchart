import React from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { LogNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';

export type LogNodeProps = NodeProps<Node<LogNodeData>>;

const fields = [
  createFieldConfig({
    id: 'prefix',
    label: 'Log Prefix',
    component: STInput,
    props: { placeholder: 'Prefix for the log message', type: 'text' },
  }),
];

export const LogNode: React.FC<LogNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as LogNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Log Message" selected={selected}>
      <Handle type="target" position={Position.Left} id="main" />
      <NodeFieldRenderer nodeId={id} nodeType={type} fields={fields} data={data} updateNodeData={updateNodeData} />
      <Handle type="source" position={Position.Right} id="main" />
    </BaseNode>
  );
};

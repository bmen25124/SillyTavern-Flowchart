import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { RunSlashCommandNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STTextarea } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from './NodeFieldRenderer.js';
import { createFieldConfig } from './fieldConfig.js';

export type RunSlashCommandNodeProps = NodeProps<Node<RunSlashCommandNodeData>>;

const fields = [
  createFieldConfig({
    id: 'command',
    label: 'Command',
    component: STTextarea,
    props: { rows: 3, placeholder: '/echo "Hello World"' },
  }),
];

export const RunSlashCommandNode: FC<RunSlashCommandNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as RunSlashCommandNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Run Slash Command" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={fields} data={data} updateNodeData={updateNodeData} />
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Result (Pipe)</span>
          <Handle
            type="source"
            position={Position.Right}
            id="result"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
      </div>
    </BaseNode>
  );
};

import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { DateTimeNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from './NodeFieldRenderer.js';
import { createFieldConfig } from './fieldConfig.js';

export type DateTimeNodeProps = NodeProps<Node<DateTimeNodeData>>;

const outputFields = ['iso', 'timestamp', 'year', 'month', 'day', 'hour', 'minute', 'second'] as const;

const fields = [
  createFieldConfig({
    id: 'format',
    label: 'Format (Optional)',
    component: STInput,
    props: { placeholder: 'Default: ISO String', type: 'text' },
  }),
];

export const DateTimeNode: FC<DateTimeNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as DateTimeNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Date/Time" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={fields} data={data} updateNodeData={updateNodeData} />
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        {outputFields.map((field) => (
          <div
            key={field}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}
          >
            <span style={{ textTransform: 'capitalize' }}>{field}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={field}
              style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
            />
          </div>
        ))}
      </div>
    </BaseNode>
  );
};

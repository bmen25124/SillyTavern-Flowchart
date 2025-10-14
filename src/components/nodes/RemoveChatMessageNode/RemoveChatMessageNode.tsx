import React, { FC } from 'react';
import { NodeProps, Node, Handle, Position } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { RemoveChatMessageNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { FlowDataTypeColors } from '../../../flow-types.js';

export type RemoveChatMessageNodeProps = NodeProps<Node<RemoveChatMessageNodeData>>;

const fields = [
  createFieldConfig({
    id: 'messageId',
    label: 'Message ID',
    component: STInput,
    props: { type: 'number' },
    getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
  }),
];

export const RemoveChatMessageNode: FC<RemoveChatMessageNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as RemoveChatMessageNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Remove Chat Message" selected={selected}>
      <NodeFieldRenderer nodeId={id} nodeType={type} fields={fields} data={data} updateNodeData={updateNodeData} />
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
          <span>Message ID (Passthrough)</span>
          <Handle
            type="source"
            position={Position.Right}
            id="messageId"
            style={{
              position: 'relative',
              transform: 'none',
              right: 0,
              top: 0,
              backgroundColor: FlowDataTypeColors.number,
            }}
          />
        </div>
      </div>
    </BaseNode>
  );
};

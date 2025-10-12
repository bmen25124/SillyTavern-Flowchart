import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { EditChatMessageNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STTextarea } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from './NodeFieldRenderer.js';
import { createFieldConfig } from './fieldConfig.js';

export type EditChatMessageNodeProps = NodeProps<Node<EditChatMessageNodeData>>;

const fields = [
  createFieldConfig({
    id: 'messageId',
    label: 'Message ID',
    component: STInput,
    props: { type: 'number' },
    getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
  }),
  createFieldConfig({
    id: 'message',
    label: 'New Message Content',
    component: STTextarea,
    props: { rows: 3 },
  }),
];

export const EditChatMessageNode: FC<EditChatMessageNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as EditChatMessageNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Edit Chat Message" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={fields} data={data} updateNodeData={updateNodeData} />
      <Handle type="source" position={Position.Right} id="messageObject" />
    </BaseNode>
  );
};

import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { EditChatMessageNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STTextarea } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';
import { schemaToText } from '../../../utils/schema-inspector.js';

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

export const EditChatMessageNode: FC<EditChatMessageNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as EditChatMessageNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('editChatMessageNode');
  const objectHandle = definition?.handles.outputs.find((h) => h.id === 'messageObject');
  const schemaText = objectHandle?.schema ? schemaToText(objectHandle.schema) : objectHandle?.type;

  if (!data) return null;

  return (
    <BaseNode id={id} title="Edit Chat Message" selected={selected}>
      <NodeFieldRenderer nodeId={id} nodeType={type} fields={fields} data={data} updateNodeData={updateNodeData} />
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}
          title={schemaText}
        >
          <span>Message Object</span>
          <Handle type="source" position={Position.Right} id="messageObject" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
          <span>Message (Passthrough)</span>
          <Handle type="source" position={Position.Right} id="message" />
        </div>
      </div>
    </BaseNode>
  );
};

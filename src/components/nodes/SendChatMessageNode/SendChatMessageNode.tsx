import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { SendChatMessageNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STSelect, STTextarea } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';

export type SendChatMessageNodeProps = NodeProps<Node<SendChatMessageNodeData>>;

const fields = [
  createFieldConfig({ id: 'main', label: 'Message Content', component: STTextarea, props: { rows: 3 } }),
  createFieldConfig({
    id: 'role',
    label: 'Role',
    component: STSelect,
    props: {
      children: (
        <>
          <option value="assistant">Assistant</option>
          <option value="user">User</option>
          <option value="system">System</option>
        </>
      ),
    },
  }),
  createFieldConfig({ id: 'name', label: 'Name (Optional)', component: STInput, props: { type: 'text' } }),
];

export const SendChatMessageNode: FC<SendChatMessageNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as SendChatMessageNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Send Chat Message" selected={selected}>
      <NodeFieldRenderer nodeId={id} nodeType={type} fields={fields} data={data} updateNodeData={updateNodeData} />
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
          <span>Message ID</span>
          <Handle type="source" position={Position.Right} id="messageId" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
          <span>Message (Passthrough)</span>
          <Handle type="source" position={Position.Right} id="main" />
        </div>
      </div>
    </BaseNode>
  );
};

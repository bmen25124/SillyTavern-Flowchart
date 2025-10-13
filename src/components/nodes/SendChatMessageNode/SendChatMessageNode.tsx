import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { SendChatMessageNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STSelect, STTextarea } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';
import { schemaToText } from '../../../utils/schema-inspector.js';

export type SendChatMessageNodeProps = NodeProps<Node<SendChatMessageNodeData>>;

const fields = [
  createFieldConfig({ id: 'message', label: 'Message Content', component: STTextarea, props: { rows: 3 } }),
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
  const definition = registrator.nodeDefinitionMap.get('sendChatMessageNode');
  const resultHandle = definition?.handles.outputs.find((h) => h.id === 'messageId');
  const schemaText = resultHandle?.schema ? schemaToText(resultHandle.schema) : resultHandle?.type;

  if (!data) return null;

  return (
    <BaseNode id={id} title="Send Chat Message" selected={selected}>
      <NodeFieldRenderer nodeId={id} nodeType={type} fields={fields} data={data} updateNodeData={updateNodeData} />
      <div title={schemaText}>
        <Handle type="source" position={Position.Right} id="messageId" />
      </div>
    </BaseNode>
  );
};

import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { SendChatMessageNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STSelect, STTextarea } from 'sillytavern-utils-lib/components';
import { createFieldConfig } from '../fieldConfig.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { registrator } from '../autogen-imports.js';

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
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Send Chat Message" selected={selected}>
      <NodeHandleRenderer
        nodeId={id}
        definition={definition}
        type="input"
        fields={fields}
        data={data}
        updateNodeData={updateNodeData}
      />
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};

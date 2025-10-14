import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { NotificationNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STSelect, STTextarea } from 'sillytavern-utils-lib/components';
import { createFieldConfig } from '../fieldConfig.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { registrator } from '../autogen-imports.js';

export type NotificationNodeProps = NodeProps<Node<NotificationNodeData>>;

const fields = [
  createFieldConfig({
    id: 'message',
    label: 'Message',
    component: STTextarea,
    props: { rows: 3 },
  }),
  createFieldConfig({
    id: 'notificationType',
    label: 'Type',
    component: STSelect,
    props: {
      children: (
        <>
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </>
      ),
    },
  }),
];

export const NotificationNode: FC<NotificationNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as NotificationNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Notification" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeHandleRenderer
          nodeId={id}
          definition={definition}
          type="input"
          fields={fields}
          data={data}
          updateNodeData={updateNodeData}
        />

        <div style={{ borderTop: '1px solid #555', paddingTop: '10px', marginTop: '5px' }}>
          <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
        </div>
      </div>
    </BaseNode>
  );
};

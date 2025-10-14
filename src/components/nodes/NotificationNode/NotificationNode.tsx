import { FC } from 'react';
import { NodeProps, Node, Handle, Position } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { NotificationNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STSelect, STTextarea } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { FlowDataTypeColors } from '../../../flow-types.js';

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

  if (!data) return null;

  return (
    <BaseNode id={id} title="Notification" selected={selected}>
      <Handle
        type="target"
        position={Position.Left}
        id="main"
        style={{ top: '15px', backgroundColor: FlowDataTypeColors.any }}
      />

      <NodeFieldRenderer nodeId={id} nodeType={type} fields={fields} data={data} updateNodeData={updateNodeData} />

      <Handle
        type="source"
        position={Position.Right}
        id="main"
        style={{ top: '15px', backgroundColor: FlowDataTypeColors.any }}
      />
    </BaseNode>
  );
};

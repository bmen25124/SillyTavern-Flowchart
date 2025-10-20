import React, { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { EditChatMessageNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STTextarea } from 'sillytavern-utils-lib/components';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

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
    props: { rows: 2, placeholder: '(Optional) Leave blank to not change.' },
  }),
  createFieldConfig({
    id: 'displayText',
    label: 'Display Text',
    component: STTextarea,
    props: { rows: 2, placeholder: '(Optional) Overrides display text.' },
  }),
  createFieldConfig({
    id: 'removeDisplayText',
    label: 'Remove Display Text',
    component: STInput,
    props: { type: 'checkbox' },
    getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => e.target.checked,
  }),
];

export const EditChatMessageNode: FC<EditChatMessageNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as EditChatMessageNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Edit Chat Message" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
      </div>
    </BaseNode>
  );
};

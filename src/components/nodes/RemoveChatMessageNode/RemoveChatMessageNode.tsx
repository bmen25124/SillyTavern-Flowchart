import React, { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { RemoveChatMessageNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type RemoveChatMessageNodeProps = NodeProps<Node<RemoveChatMessageNodeData>>;

const fields = [
  createFieldConfig({
    id: 'main',
    label: 'Message ID',
    component: STInput,
    props: { type: 'number' },
    getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
  }),
];

export const RemoveChatMessageNode: FC<RemoveChatMessageNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as RemoveChatMessageNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Remove Chat Message" selected={selected}>
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

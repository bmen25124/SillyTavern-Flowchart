import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { GetChatMessagesNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type GetChatMessagesNodeProps = NodeProps<Node<GetChatMessagesNodeData>>;

const fields = [
  createFieldConfig({
    id: 'startId',
    label: 'Start ID (e.g., first, 0, 123)',
    component: STInput,
    props: { placeholder: 'first', type: 'text' },
  }),
  createFieldConfig({
    id: 'endId',
    label: 'End ID (e.g., last, 10, 123)',
    component: STInput,
    props: { placeholder: 'last', type: 'text' },
  }),
];

export const GetChatMessagesNode: FC<GetChatMessagesNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetChatMessagesNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Get Chat Messages" selected={selected}>
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

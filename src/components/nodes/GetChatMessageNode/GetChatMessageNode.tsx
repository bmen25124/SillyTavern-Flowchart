import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { GetChatMessageNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';
import { schemaToText } from '../../../utils/schema-inspector.js';

export type GetChatMessageNodeProps = NodeProps<Node<GetChatMessageNodeData>>;

const fields = [
  createFieldConfig({
    id: 'messageId',
    label: 'Message ID (e.g., last, first, 123)',
    component: STInput,
    props: { placeholder: 'last', type: 'text' },
  }),
];

export const GetChatMessageNode: FC<GetChatMessageNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetChatMessageNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('getChatMessageNode');

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Get Chat Message" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={fields} data={data} updateNodeData={updateNodeData} />

      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        {definition.handles.outputs.map((handle) => {
          const schemaText = handle.schema ? schemaToText(handle.schema) : handle.type;
          const label = (handle.id ?? 'Result').replace('_', ' ');
          return (
            <div
              key={handle.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}
              title={schemaText}
            >
              <span style={{ textTransform: 'capitalize' }}>{label}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={handle.id}
                style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
              />
            </div>
          );
        })}
      </div>
    </BaseNode>
  );
};

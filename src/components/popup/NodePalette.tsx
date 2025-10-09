import { FC } from 'react';
import { useFlow } from './FlowContext.js';
import { STButton } from 'sillytavern-utils-lib/components';

const availableNodes = [
  { type: 'starterNode', label: 'Starter Node', data: { selectedEventType: 'user_message_rendered' } },
  { type: 'ifNode', label: 'If Node', data: { conditions: [{ id: crypto.randomUUID(), code: 'return true;' }] } },
  { type: 'createMessagesNode', label: 'Create Messages Node', data: { profileId: '' } },
  { type: 'stringNode', label: 'String Node', data: { name: 'myString', value: 'hello' } },
  { type: 'numberNode', label: 'Number Node', data: { name: 'myNumber', value: 123 } },
  {
    type: 'structuredRequestNode',
    label: 'Structured Request Node',
    data: {
      profileId: '',
      schemaName: 'mySchema',
      messageId: 0,
      promptEngineeringMode: 'native',
      maxResponseToken: 1000,
    },
  },
  { type: 'schemaNode', label: 'Schema Node', data: { name: 'mySchema', fields: [] } },
];

export const NodePalette: FC = () => {
  const { addNode } = useFlow();

  const onNodeClick = (nodeType: string, data: any) => {
    addNode({
      type: nodeType,
      position: { x: 100, y: 100 }, // Default position, can be improved
      data,
    });
  };

  return (
    <div className="flowchart-node-palette">
      <h3>Add Node</h3>
      <div style={{ display: 'flex' }}>
        {availableNodes.map((node) => (
          <STButton key={node.type} onClick={() => onNodeClick(node.type, node.data)}>
            {node.label}
          </STButton>
        ))}
      </div>
    </div>
  );
};

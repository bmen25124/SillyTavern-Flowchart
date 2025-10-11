import { FC } from 'react';
import { useFlow } from './FlowContext.js';
import { STButton } from 'sillytavern-utils-lib/components';

export const availableNodes = [
  { type: 'triggerNode', label: 'Trigger Node', data: { selectedEventType: 'user_message_rendered' } },
  { type: 'ifNode', label: 'If Node', data: { conditions: [{ id: crypto.randomUUID(), code: 'return true;' }] } },
  { type: 'createMessagesNode', label: 'Create Messages Node', data: { profileId: '' } },
  {
    type: 'customMessageNode',
    label: 'Custom Message Node',
    data: { messages: [{ id: crypto.randomUUID(), role: 'system', content: 'You are a helpful assistant.' }] },
  },
  { type: 'mergeMessagesNode', label: 'Merge Messages Node', data: { inputCount: 2 } },
  { type: 'stringNode', label: 'String Node', data: { value: 'hello' } },
  { type: 'numberNode', label: 'Number Node', data: { value: 123 } },
  {
    type: 'structuredRequestNode',
    label: 'Structured Request Node',
    data: {
      profileId: '',
      schemaName: 'mySchema',
      promptEngineeringMode: 'native',
      maxResponseToken: 1000,
    },
  },
  { type: 'schemaNode', label: 'Schema Node', data: { fields: [] } },
  { type: 'profileIdNode', label: 'Profile ID Node', data: { profileId: '' } },
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        {availableNodes.map((node) => (
          <STButton key={node.type} onClick={() => onNodeClick(node.type, structuredClone(node.data))}>
            {node.label.split(' Node')[0]}
          </STButton>
        ))}
      </div>
    </div>
  );
};

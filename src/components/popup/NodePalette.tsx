import { FC } from 'react';
import { useFlow } from './FlowContext.js';
import { STButton } from 'sillytavern-utils-lib/components';

const availableNodes = [
  { type: 'starterNode', label: 'Starter Node', data: { selectedEventType: 'user_message_rendered' } },
  { type: 'ifElseNode', label: 'If/Else Node', data: { code: 'return true;' } },
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

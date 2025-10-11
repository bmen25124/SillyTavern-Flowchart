import { FC, useMemo, useState } from 'react';
import { useFlowStore } from './flowStore.js';
import { STButton, STInput } from 'sillytavern-utils-lib/components';
import { allNodeDefinitions } from '../nodes/definitions/index.js';

export const NodePalette: FC = () => {
  const addNode = useFlowStore((state) => state.addNode);
  const [searchTerm, setSearchTerm] = useState('');

  const onNodeClick = (nodeType: string, data: any) => {
    addNode({
      type: nodeType,
      position: { x: 100, y: 100 }, // Default position, can be improved
      data,
    });
  };

  const filteredNodes = useMemo(() => {
    if (!searchTerm) {
      return allNodeDefinitions;
    }
    return allNodeDefinitions.filter(
      (def) =>
        def.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        def.type.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [searchTerm]);

  return (
    <div className="flowchart-node-palette">
      <h3>Add Node</h3>
      <STInput
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search nodes..."
        style={{ marginBottom: '10px' }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        {filteredNodes.map((node) => (
          <STButton key={node.type} onClick={() => onNodeClick(node.type, structuredClone(node.initialData))}>
            {node.label}
          </STButton>
        ))}
      </div>
    </div>
  );
};

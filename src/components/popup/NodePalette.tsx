import { FC, useMemo, useState } from 'react';
import { useFlowStore } from './flowStore.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { allNodeDefinitions } from '../nodes/definitions/index.js';
import { NodeDefinition } from '../nodes/definitions/types.js';
import { useReactFlow } from '@xyflow/react';
import { useDebounce } from '../../hooks/useDebounce.js';

export const NodePalette: FC = () => {
  const addNode = useFlowStore((state) => state.addNode);
  const { screenToFlowPosition } = useReactFlow();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 200);

  const onNodeClick = (event: React.MouseEvent, nodeType: string, data: any) => {
    // Place node at center of viewport if clicked, or at mouse pos if dragged (not implemented here but good practice)
    // For palette click, we place it near the center of the current view
    const flowWrapper = document.querySelector('.react-flow') as HTMLElement;
    const center = {
      x: flowWrapper.clientWidth / 2,
      y: flowWrapper.clientHeight / 2,
    };
    const position = screenToFlowPosition({
      x: flowWrapper.getBoundingClientRect().left + center.x,
      y: flowWrapper.getBoundingClientRect().top + center.y,
    });

    addNode({
      type: nodeType,
      position: { x: position.x - 75, y: position.y - 25 }, // approximate center of node
      data,
    });
  };

  const filteredNodes = useMemo(() => {
    if (!debouncedSearchTerm) {
      return allNodeDefinitions;
    }
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    return allNodeDefinitions.filter(
      (def) =>
        def.label.toLowerCase().includes(lowerSearch) ||
        def.type.toLowerCase().includes(lowerSearch) ||
        def.category.toLowerCase().includes(lowerSearch),
    );
  }, [debouncedSearchTerm]);

  const groupedNodes = useMemo(() => {
    const groups: Record<string, NodeDefinition[]> = {};
    for (const def of filteredNodes) {
      if (!groups[def.category]) {
        groups[def.category] = [];
      }
      groups[def.category].push(def);
    }

    // Custom sort order for categories
    const categoryOrder = [
      'Trigger',
      'Logic',
      'Input',
      'Picker',
      'Chat',
      'API Request',
      'Character',
      'Lorebook',
      'JSON',
      'Utility',
    ];

    return Object.entries(groups).sort(([a], [b]) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      // If both are in the list, sort by list order
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // If only a is in list, it comes first
      if (indexA !== -1) return -1;
      // If only b is in list, it comes first
      if (indexB !== -1) return 1;
      // Otherwise alphabetical
      return a.localeCompare(b);
    });
  }, [filteredNodes]);

  return (
    <div className="flowchart-node-palette">
      <div className="palette-header">
        <h3>Nodes</h3>
        <STInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search..."
          className="palette-search"
        />
      </div>
      <div className="palette-categories">
        {groupedNodes.map(([category, nodes]) => (
          <div key={category} className="palette-category">
            <div className="category-label">
              {category}
              <span className="fa-solid fa-chevron-right"></span>
            </div>
            <div className="category-nodes">
              <div className="category-nodes-list">
                {nodes.map((node) => (
                  <div
                    key={node.type}
                    className="node-item"
                    onClick={(e) => onNodeClick(e, node.type, structuredClone(node.initialData))}
                    title={node.label}
                  >
                    {node.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

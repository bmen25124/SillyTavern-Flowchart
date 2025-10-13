import { FC, useEffect } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { RandomNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { useIsConnected } from '../../../hooks/useIsConnected.js';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';

export type RandomNodeProps = NodeProps<Node<RandomNodeData>>;

const fields = [
  createFieldConfig({
    id: 'mode',
    label: 'Mode',
    component: STSelect,
    props: {
      children: (
        <>
          <option value="number">Number</option>
          <option value="array">From Array</option>
        </>
      ),
    },
  }),
];

export const RandomNode: FC<RandomNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as RandomNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const edges = useFlowStore((state) => state.edges);
  const setEdges = useFlowStore((state) => state.setEdges);
  const isMinConnected = useIsConnected(id, 'min');
  const isMaxConnected = useIsConnected(id, 'max');

  // Safely access data before useEffect hook
  const mode = data?.mode ?? 'number';

  useEffect(() => {
    const handlesToClear: string[] = [];
    if (mode === 'number') handlesToClear.push('array');
    if (mode === 'array') handlesToClear.push('min', 'max');

    const filteredEdges = edges.filter(
      (edge) => !(edge.target === id && handlesToClear.includes(edge.targetHandle || '')),
    );

    if (filteredEdges.length < edges.length) {
      setEdges(filteredEdges);
    }
  }, [mode, id, setEdges, edges]);

  // Early return after all hooks
  if (!data) return null;

  return (
    <BaseNode id={id} title="Random" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeFieldRenderer nodeId={id} nodeType={type} fields={fields} data={data} updateNodeData={updateNodeData} />

        {mode === 'number' && (
          <>
            <div style={{ position: 'relative' }}>
              <Handle type="target" position={Position.Left} id="min" style={{ top: '50%' }} />
              {!isMinConnected ? (
                <STInput
                  className="nodrag"
                  type="number"
                  value={data.min ?? 0}
                  onChange={(e) => updateNodeData(id, { min: Number(e.target.value) })}
                  placeholder="Min"
                />
              ) : (
                <label style={{ marginLeft: '10px' }}>Min</label>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <Handle type="target" position={Position.Left} id="max" style={{ top: '50%' }} />
              {!isMaxConnected ? (
                <STInput
                  className="nodrag"
                  type="number"
                  value={data.max ?? 100}
                  onChange={(e) => updateNodeData(id, { max: Number(e.target.value) })}
                  placeholder="Max"
                />
              ) : (
                <label style={{ marginLeft: '10px' }}>Max</label>
              )}
            </div>
          </>
        )}

        {mode === 'array' && (
          <div style={{ position: 'relative' }}>
            <Handle
              type="target"
              position={Position.Left}
              id="array"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            />
            <label style={{ marginLeft: '10px' }}>Array (from connection)</label>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}>
        <span>Result</span>
        <Handle
          type="source"
          position={Position.Right}
          id="result"
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    </BaseNode>
  );
};

import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node, useEdges } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { RandomNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type RandomNodeProps = NodeProps<Node<RandomNodeData>>;

export const RandomNode: FC<RandomNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as RandomNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const edges = useEdges();

  if (!data) return null;

  const isConnected = (fieldId: string) => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);
  const mode = data.mode ?? 'number';

  return (
    <BaseNode id={id} title="Random" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="mode"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Mode</label>
          {!isConnected('mode') && (
            <STSelect
              className="nodrag"
              value={mode}
              onChange={(e) => updateNodeData(id, { mode: e.target.value as any })}
            >
              <option value="number">Number</option>
              <option value="array">From Array</option>
            </STSelect>
          )}
        </div>

        {mode === 'number' && (
          <>
            <div style={{ position: 'relative' }}>
              <Handle type="target" position={Position.Left} id="min" style={{ top: '50%' }} />
              {!isConnected('min') ? (
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
              {!isConnected('max') ? (
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

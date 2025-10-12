import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node, useEdges } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { MathNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type MathNodeProps = NodeProps<Node<MathNodeData>>;

const operations = ['add', 'subtract', 'multiply', 'divide', 'modulo'] as const;

export const MathNode: FC<MathNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as MathNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const edges = useEdges();

  if (!data) return null;

  const isConnected = (fieldId: 'a' | 'b') => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);

  return (
    <BaseNode id={id} title="Math Operation" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <STSelect
          className="nodrag"
          value={data.operation}
          onChange={(e) => updateNodeData(id, { operation: e.target.value as any })}
        >
          {operations.map((op) => (
            <option key={op} value={op} style={{ textTransform: 'capitalize' }}>
              {op}
            </option>
          ))}
        </STSelect>
        <div style={{ position: 'relative' }}>
          <Handle type="target" position={Position.Left} id="a" style={{ top: '50%', transform: 'translateY(-50%)' }} />
          {!isConnected('a') ? (
            <STInput
              className="nodrag"
              type="number"
              value={data.a ?? 0}
              onChange={(e) => updateNodeData(id, { a: Number(e.target.value) })}
              placeholder="Value A"
            />
          ) : (
            <label style={{ marginLeft: '10px' }}>Value A</label>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <Handle type="target" position={Position.Left} id="b" style={{ top: '50%', transform: 'translateY(-50%)' }} />
          {!isConnected('b') ? (
            <STInput
              className="nodrag"
              type="number"
              value={data.b ?? 0}
              onChange={(e) => updateNodeData(id, { b: Number(e.target.value) })}
              placeholder="Value B"
            />
          ) : (
            <label style={{ marginLeft: '10px' }}>Value B</label>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '5px' }}>
          <span>Result</span>
          <Handle
            type="source"
            position={Position.Right}
            id="result"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
      </div>
    </BaseNode>
  );
};

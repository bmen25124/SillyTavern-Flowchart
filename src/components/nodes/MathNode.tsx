import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { MathNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { useIsConnected } from '../../hooks/useIsConnected.js';

export type MathNodeProps = NodeProps<Node<MathNodeData>>;

const operations = ['add', 'subtract', 'multiply', 'divide', 'modulo'] as const;

export const MathNode: FC<MathNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as MathNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isOpConnected = useIsConnected(id, 'operation');
  const isAConnected = useIsConnected(id, 'a');
  const isBConnected = useIsConnected(id, 'b');

  if (!data) return null;

  return (
    <BaseNode id={id} title="Math Operation" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="operation"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Operation</label>
          {!isOpConnected && (
            <STSelect
              className="nodrag"
              value={data.operation ?? 'add'}
              onChange={(e) => updateNodeData(id, { operation: e.target.value as any })}
            >
              {operations.map((op) => (
                <option key={op} value={op} style={{ textTransform: 'capitalize' }}>
                  {op}
                </option>
              ))}
            </STSelect>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <Handle type="target" position={Position.Left} id="a" style={{ top: '50%', transform: 'translateY(-50%)' }} />
          {!isAConnected ? (
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
          {!isBConnected ? (
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

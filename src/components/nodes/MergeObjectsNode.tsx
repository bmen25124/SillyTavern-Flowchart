import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { BaseNode } from './BaseNode.js';
import { MergeObjectsNodeData } from '../../flow-types.js';
import { useFlowStore } from '../popup/flowStore.js';
import { STButton } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type MergeObjectsNodeProps = NodeProps<Node<MergeObjectsNodeData>>;

export const MergeObjectsNode: FC<MergeObjectsNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as MergeObjectsNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );

  if (!data) return null;

  const inputCount = data.inputCount ?? 2;

  const setInputCount = (count: number) => {
    updateNodeData(id, { inputCount: Math.max(1, count) });
  };

  const handles = Array.from({ length: inputCount }, (_, i) => (
    <div key={`input_${i}`} style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
      <Handle
        type="target"
        position={Position.Left}
        id={`object_${i}`}
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
      <label style={{ marginLeft: '10px' }}>Object {i + 1}</label>
    </div>
  ));

  return (
    <BaseNode id={id} title="Merge Objects" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{handles}</div>
      <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
        <STButton onClick={() => setInputCount(inputCount + 1)}>+</STButton>
        <STButton onClick={() => setInputCount(inputCount - 1)} disabled={inputCount <= 1}>
          -
        </STButton>
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

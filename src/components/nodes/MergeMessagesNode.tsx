import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { BaseNode } from './BaseNode.js';
import { MergeMessagesNodeData } from '../../flow-types.js';
import { useFlow } from '../popup/FlowContext.js';
import { STButton } from 'sillytavern-utils-lib/components';

export type MergeMessagesNodeProps = NodeProps<Node<MergeMessagesNodeData>>;

export const MergeMessagesNode: FC<MergeMessagesNodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useFlow();
  const inputCount = data.inputCount ?? 2;

  const setInputCount = (count: number) => {
    updateNodeData(id, { inputCount: Math.max(1, count) });
  };

  const handles = Array.from({ length: inputCount }, (_, i) => (
    <div key={`input_${i}`} style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
      <Handle
        type="target"
        position={Position.Left}
        id={`messages_${i}`}
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
      <label style={{ marginLeft: '10px' }}>Messages {i + 1}</label>
    </div>
  ));

  return (
    <BaseNode id={id} title="Merge Messages" selected={selected}>
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

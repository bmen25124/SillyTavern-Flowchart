import { FC, useEffect } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { MergeMessagesNodeData } from './definition.js';
import { useFlowStore } from '../../popup/flowStore.js';
import { STButton } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';
import { registrator } from '../autogen-imports.js';

export type MergeMessagesNodeProps = NodeProps<Node<MergeMessagesNodeData>>;

export const MergeMessagesNode: FC<MergeMessagesNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData, edges, setEdges } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as MergeMessagesNodeData,
      updateNodeData: state.updateNodeData,
      edges: state.edges,
      setEdges: state.setEdges,
    }),
    shallow,
  );

  const definition = registrator.nodeDefinitionMap.get('mergeMessagesNode')!;
  const inputCount = data?.inputCount ?? 2;

  useEffect(() => {
    const existingHandleIds = new Set(Array.from({ length: inputCount }, (_, i) => definition.getDynamicHandleId!(i)));
    const filteredEdges = edges.filter(
      (edge) => !(edge.target === id && edge.targetHandle && !existingHandleIds.has(edge.targetHandle)),
    );

    if (filteredEdges.length < edges.length) {
      setEdges(filteredEdges);
    }
  }, [inputCount, id, setEdges, edges, definition]);

  if (!data) return null;

  const setInputCount = (count: number) => {
    updateNodeData(id, { inputCount: Math.max(1, count) });
  };

  const handles = Array.from({ length: inputCount }, (_, i) => (
    <div key={`input_${i}`} style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
      <Handle
        type="target"
        position={Position.Left}
        id={definition.getDynamicHandleId!(i)}
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

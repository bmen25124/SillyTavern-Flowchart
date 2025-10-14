import { FC, useEffect } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { MergeMessagesNodeData } from './definition.js';
import { useFlowStore } from '../../popup/flowStore.js';
import { STButton } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type MergeMessagesNodeProps = NodeProps<Node<MergeMessagesNodeData>>;

export const MergeMessagesNode: FC<MergeMessagesNodeProps> = ({ id, selected, type }) => {
  const { data, updateNodeData, edges, setEdges } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as MergeMessagesNodeData,
      updateNodeData: state.updateNodeData,
      edges: state.edges,
      setEdges: state.setEdges,
    }),
    shallow,
  );

  const definition = registrator.nodeDefinitionMap.get(type)!;
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

  return (
    <BaseNode id={id} title="Merge Messages" selected={selected}>
      <NodeHandleRenderer nodeId={id} definition={definition} type="input" />
      <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
        <STButton onClick={() => setInputCount(inputCount + 1)}>+</STButton>
        <STButton onClick={() => setInputCount(inputCount - 1)} disabled={inputCount <= 1}>
          -
        </STButton>
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};

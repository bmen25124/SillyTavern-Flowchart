import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { MergeObjectsNodeData } from './definition.js';
import { useFlowStore } from '../../popup/flowStore.js';
import { STButton } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type MergeObjectsNodeProps = NodeProps<Node<MergeObjectsNodeData>>;

export const MergeObjectsNode: FC<MergeObjectsNodeProps> = ({ id, selected, type }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as MergeObjectsNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );

  const definition = registrator.nodeDefinitionMap.get(type)!;
  const inputCount = data?.inputCount ?? 2;

  if (!data) return null;

  const setInputCount = (count: number) => {
    updateNodeData(id, { inputCount: Math.max(1, count) });
  };

  return (
    <BaseNode id={id} title="Merge Objects" selected={selected}>
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

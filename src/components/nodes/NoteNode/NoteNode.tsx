import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { NoteNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STTextarea } from 'sillytavern-utils-lib/components';

export type NoteNodeProps = NodeProps<Node<NoteNodeData>>;

export const NoteNode: FC<NoteNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as NoteNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { text: e.target.value });
  };

  return (
    <BaseNode id={id} title="Note" selected={selected} contentGrows minWidth={60}>
      <STTextarea
        className="nodrag nowheel"
        value={data.text}
        onChange={handleTextChange}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'transparent',
          resize: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
    </BaseNode>
  );
};

import { FC } from 'react';
import { NodeProps, NodeResizer, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { GroupNodeData } from '../../flow-types.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type GroupNodeProps = NodeProps<Node<GroupNodeData>>;

export const GroupNode: FC<GroupNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as GroupNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );

  if (!data) return null;

  return (
    <div className="flow-group-node">
      <NodeResizer isVisible={selected} minWidth={150} minHeight={100} />
      <STInput
        className="nodrag flow-group-node-label"
        value={data.label ?? 'Group'}
        onChange={(e) => updateNodeData(id, { label: e.target.value })}
      />
    </div>
  );
};

import { FC } from 'react';
import { NodeProps, NodeResizer, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { GroupNodeData } from './definition.js';
import { STInput } from 'sillytavern-utils-lib/components';

export type GroupNodeProps = NodeProps<Node<GroupNodeData>>;

export const GroupNode: FC<GroupNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GroupNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

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

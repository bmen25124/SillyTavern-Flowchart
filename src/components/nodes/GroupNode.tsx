import { FC } from 'react';
import { NodeProps, NodeResizer, Node } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { GroupNodeData } from '../../flow-types.js';
import { STInput } from 'sillytavern-utils-lib/components';

export type GroupNodeProps = NodeProps<Node<GroupNodeData>>;

export const GroupNode: FC<GroupNodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useFlow();

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

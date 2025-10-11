import { FC } from 'react';
import { Handle, Position, useEdges, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { CreateLorebookNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type CreateLorebookNodeProps = NodeProps<Node<CreateLorebookNodeData>>;

export const CreateLorebookNode: FC<CreateLorebookNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as CreateLorebookNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const edges = useEdges();

  if (!data) return null;

  const isConnected = (fieldId: string) => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);

  return (
    <BaseNode id={id} title="Create Lorebook" selected={selected}>
      <div style={{ position: 'relative' }}>
        <Handle
          type="target"
          position={Position.Left}
          id="worldName"
          style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
        />
        <label style={{ marginLeft: '10px' }}>Lorebook Name</label>
        {!isConnected('worldName') && (
          <STInput
            className="nodrag"
            value={data.worldName ?? ''}
            onChange={(e) => updateNodeData(id, { worldName: e.target.value })}
          />
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

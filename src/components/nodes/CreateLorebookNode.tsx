import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { CreateLorebookNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { useIsConnected } from '../../hooks/useIsConnected.js';

export type CreateLorebookNodeProps = NodeProps<Node<CreateLorebookNodeData>>;

export const CreateLorebookNode: FC<CreateLorebookNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as CreateLorebookNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isWorldNameConnected = useIsConnected(id, 'worldName');

  if (!data) return null;

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
        {!isWorldNameConnected && (
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

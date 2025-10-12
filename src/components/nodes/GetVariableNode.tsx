import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { GetVariableNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { useIsConnected } from '../../hooks/useIsConnected.js';

export type GetVariableNodeProps = NodeProps<Node<GetVariableNodeData>>;

export const GetVariableNode: FC<GetVariableNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetVariableNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isNameConnected = useIsConnected(id, 'variableName');
  const isScopeConnected = useIsConnected(id, 'scope');

  if (!data) return null;

  return (
    <BaseNode id={id} title="Get Variable" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="variableName"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Variable Name</label>
          {!isNameConnected && (
            <STInput
              className="nodrag"
              value={data.variableName ?? ''}
              onChange={(e) => updateNodeData(id, { variableName: e.target.value })}
            />
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="scope"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Scope</label>
          {!isScopeConnected && (
            <STSelect
              className="nodrag"
              value={data.scope ?? 'Execution'}
              onChange={(e) => updateNodeData(id, { scope: e.target.value as any })}
            >
              <option value="Execution">Flow Execution</option>
              <option value="Session">SillyTavern Session</option>
            </STSelect>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <span>Value</span>
        <Handle type="source" position={Position.Right} id="value" />
      </div>
    </BaseNode>
  );
};

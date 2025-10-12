import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node, useEdges } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { SetVariableNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type SetVariableNodeProps = NodeProps<Node<SetVariableNodeData>>;

export const SetVariableNode: FC<SetVariableNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as SetVariableNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const edges = useEdges();

  if (!data) return null;

  const isConnected = (fieldId: string) => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);

  return (
    <BaseNode id={id} title="Set Variable" selected={selected}>
      <Handle type="target" position={Position.Left} id="value" style={{ top: '15%' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="variableName"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Variable Name</label>
          {!isConnected('variableName') && (
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
          {!isConnected('scope') && (
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
        <span>Value (Passthrough)</span>
        <Handle type="source" position={Position.Right} id="value" />
      </div>
    </BaseNode>
  );
};

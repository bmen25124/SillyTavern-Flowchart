import React, { FC } from 'react';
import { Handle, Position, useEdges, NodeProps, Node } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { StructuredRequestNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STConnectionProfileSelect, STInput, STSelect } from 'sillytavern-utils-lib/components';
import { PromptEngineeringMode } from '../../config.js';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';

export type StructuredRequestNodeProps = NodeProps<Node<StructuredRequestNodeData>>;

export const StructuredRequestNode: FC<StructuredRequestNodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useFlow();
  const edges = useEdges();

  const isSchemaConnected = edges.some((edge) => edge.target === id && edge.targetHandle === 'schema');
  const isMessagesConnected = edges.some((edge) => edge.target === id && edge.targetHandle === 'messages');
  const isMessageIdConnected = edges.some((edge) => edge.target === id && edge.targetHandle === 'messageId');
  const isMaxResponseTokenConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === 'maxResponseToken',
  );
  const isProfileIdConnected = edges.some((edge) => edge.target === id && edge.targetHandle === 'profileId');

  const handleProfileChange = (profile?: ConnectionProfile) => {
    updateNodeData(id, { profileId: profile?.id || '' });
  };

  const handleMessageIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    updateNodeData(id, { messageId: value === '' ? undefined : Number(value) });
  };

  return (
    <BaseNode id={id} title="Structured Request" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="profileId"
            style={{ transform: 'translateY(-50%)', top: '0.5rem' }}
          />
          <label style={{ marginLeft: '10px' }}>Connection Profile</label>
          {!isProfileIdConnected && (
            <STConnectionProfileSelect initialSelectedProfileId={data.profileId} onChange={handleProfileChange} />
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="messages"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Messages</label>
          {!isMessagesConnected && <span style={{ fontSize: '10px', color: '#888' }}> (Requires connection)</span>}
        </div>

        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="schema"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Schema Name</label>
          {!isSchemaConnected && (
            <STInput
              className="nodrag"
              value={data.schemaName}
              onChange={(e) => updateNodeData(id, { schemaName: e.target.value })}
            />
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="messageId"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Message ID</label>
          {!isMessageIdConnected && (
            <STInput className="nodrag" type="number" value={data.messageId ?? ''} onChange={handleMessageIdChange} />
          )}
        </div>

        <div>
          <label style={{ marginLeft: '10px' }}>Prompt Engineering Mode</label>
          <STSelect
            className="nodrag"
            value={data.promptEngineeringMode}
            onChange={(e) => updateNodeData(id, { promptEngineeringMode: e.target.value as any })}
          >
            {Object.values(PromptEngineeringMode).map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </STSelect>
        </div>

        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="maxResponseToken"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Max Response Token</label>
          {!isMaxResponseTokenConnected && (
            <STInput
              className="nodrag"
              type="number"
              value={data.maxResponseToken}
              onChange={(e) => updateNodeData(id, { maxResponseToken: Number(e.target.value) })}
            />
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

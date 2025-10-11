import React, { FC, useMemo } from 'react';
import { Handle, Position, useEdges, NodeProps, Node } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { StructuredRequestNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STConnectionProfileSelect, STInput, STSelect } from 'sillytavern-utils-lib/components';
import { PromptEngineeringMode } from '../../config.js';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';

export type StructuredRequestNodeProps = NodeProps<Node<StructuredRequestNodeData>>;

export const StructuredRequestNode: FC<StructuredRequestNodeProps> = ({ id, data, selected }) => {
  const { updateNodeData, nodes } = useFlow();
  const edges = useEdges();

  const schemaNode = useMemo(() => {
    const schemaEdge = edges.find((edge) => edge.target === id && edge.targetHandle === 'schema');
    if (!schemaEdge) return null;
    return nodes.find((node) => node.id === schemaEdge.source);
  }, [id, nodes, edges]);

  const schemaFields = useMemo(() => {
    if (schemaNode && schemaNode.type === 'schemaNode' && Array.isArray(schemaNode.data.fields)) {
      return schemaNode.data.fields;
    }
    return [];
  }, [schemaNode]);

  const isSchemaConnected = edges.some((edge) => edge.target === id && edge.targetHandle === 'schema');
  const isMessagesConnected = edges.some((edge) => edge.target === id && edge.targetHandle === 'messages');
  const isMaxResponseTokenConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === 'maxResponseToken',
  );
  const isProfileIdConnected = edges.some((edge) => edge.target === id && edge.targetHandle === 'profileId');

  const handleProfileChange = (profile?: ConnectionProfile) => {
    updateNodeData(id, { profileId: profile?.id || '' });
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
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span>Result (Full Object)</span>
          <Handle
            type="source"
            position={Position.Right}
            id="result"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
        {schemaFields.map((field: any) => (
          <div
            key={field.id}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}
          >
            <span>{field.name}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={field.name}
              style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
            />
          </div>
        ))}
      </div>
    </BaseNode>
  );
};

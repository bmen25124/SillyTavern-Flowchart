import React, { FC } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { StructuredRequestNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STConnectionProfileSelect, STInput, STSelect } from 'sillytavern-utils-lib/components';
import { PromptEngineeringMode } from '../../config.js';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';

export type StructuredRequestNodeProps = {
  id: string;
  data: StructuredRequestNodeData;
};

export const StructuredRequestNode: FC<StructuredRequestNodeProps> = ({ id, data }) => {
  const { updateNodeData } = useFlow();

  const handleProfileChange = (profile?: ConnectionProfile) => {
    updateNodeData(id, { profileId: profile?.id || '' });
  };

  return (
    <BaseNode id={id} title="Structured Request">
      <Handle type="target" position={Position.Left} />
      <div style={{ width: 200 }}>
        <label>Connection Profile</label>
        <STConnectionProfileSelect initialSelectedProfileId={data.profileId} onChange={handleProfileChange} />
        <label style={{ marginTop: '10px', display: 'block' }}>Schema Name</label>
        <STInput value={data.schemaName} onChange={(e) => updateNodeData(id, { schemaName: e.target.value })} />
        <label style={{ marginTop: '10px', display: 'block' }}>Message ID</label>
        <STInput
          type="number"
          value={data.messageId}
          onChange={(e) => updateNodeData(id, { messageId: Number(e.target.value) })}
        />
        <label style={{ marginTop: '10px', display: 'block' }}>Prompt Engineering Mode</label>
        <STSelect
          value={data.promptEngineeringMode}
          onChange={(e) => updateNodeData(id, { promptEngineeringMode: e.target.value })}
        >
          {Object.values(PromptEngineeringMode).map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </STSelect>
        <label style={{ marginTop: '10px', display: 'block' }}>Max Response Token</label>
        <STInput
          type="number"
          value={data.maxResponseToken}
          onChange={(e) => updateNodeData(id, { maxResponseToken: Number(e.target.value) })}
        />
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

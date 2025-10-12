import React, { FC, useState, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { CreateLorebookEntryNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { getWorldInfos } from 'sillytavern-utils-lib';
import { useIsConnected } from '../../hooks/useIsConnected.js';

export type CreateLorebookEntryNodeProps = NodeProps<Node<CreateLorebookEntryNodeData>>;

const fields = [
  { id: 'key', label: 'Keys (comma-separated)', component: STInput, props: { type: 'text' } },
  { id: 'comment', label: 'Comment (Title)', component: STInput, props: { type: 'text' } },
  { id: 'content', label: 'Content', component: STTextarea, props: { rows: 2 } },
] as const;

export const CreateLorebookEntryNode: FC<CreateLorebookEntryNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as CreateLorebookEntryNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isWorldNameConnected = useIsConnected(id, 'worldName');
  const [lorebookNames, setLorebookNames] = useState<string[]>([]);

  useEffect(() => {
    getWorldInfos(['all']).then((worlds) => {
      setLorebookNames(Object.keys(worlds));
    });
  }, []);

  const lorebookOptions = useMemo(() => lorebookNames.map((name) => ({ value: name, label: name })), [lorebookNames]);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Create Lorebook Entry" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="worldName"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Lorebook Name</label>
          {!isWorldNameConnected && (
            <STFancyDropdown
              value={[data.worldName ?? '']}
              onChange={(e) => updateNodeData(id, { worldName: e[0] })}
              multiple={false}
              items={lorebookOptions}
              inputClasses="nodrag"
              containerClasses="nodrag"
              closeOnSelect={true}
              enableSearch={true}
            />
          )}
        </div>
        {fields.map((field) => (
          <FieldInput key={field.id} id={id} field={field} data={data} updateNodeData={updateNodeData} />
        ))}
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

const FieldInput: FC<{
  id: string;
  field: (typeof fields)[number];
  data: CreateLorebookEntryNodeData;
  updateNodeData: (id: string, data: object) => void;
}> = React.memo(({ id, field, data, updateNodeData }) => {
  const isFieldConnected = useIsConnected(id, field.id);
  return (
    <div key={field.id} style={{ position: 'relative' }}>
      <Handle
        type="target"
        position={Position.Left}
        id={field.id}
        style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
      />
      <label style={{ marginLeft: '10px' }}>{field.label}</label>
      {!isFieldConnected &&
        React.createElement(field.component as any, {
          className: 'nodrag',
          value: data[field.id] ?? '',
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            updateNodeData(id, { [field.id]: e.target.value }),
          ...field.props,
        })}
    </div>
  );
});

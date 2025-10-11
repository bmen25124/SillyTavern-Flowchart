import React, { FC, useState, useEffect, useMemo } from 'react';
import { Handle, Position, useEdges, NodeProps, Node } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { CreateLorebookEntryNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { getWorldInfo } from 'sillytavern-utils-lib';

export type CreateLorebookEntryNodeProps = NodeProps<Node<CreateLorebookEntryNodeData>>;

const fields = [
  { id: 'key', label: 'Keys (comma-separated)', component: STInput, props: { type: 'text' } },
  { id: 'comment', label: 'Comment (Title)', component: STInput, props: { type: 'text' } },
  { id: 'content', label: 'Content', component: STTextarea, props: { rows: 2 } },
] as const;

export const CreateLorebookEntryNode: FC<CreateLorebookEntryNodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useFlow();
  const edges = useEdges();
  const [lorebookNames, setLorebookNames] = useState<string[]>([]);

  useEffect(() => {
    getWorldInfo(['all']).then((worlds) => {
      setLorebookNames(Object.keys(worlds));
    });
  }, []);

  const lorebookOptions = useMemo(() => lorebookNames.map((name) => ({ value: name, label: name })), [lorebookNames]);

  const isConnected = (fieldId: string) => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);

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
          {!isConnected('worldName') && (
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
          <div key={field.id} style={{ position: 'relative' }}>
            <Handle
              type="target"
              position={Position.Left}
              id={field.id}
              style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
            />
            <label style={{ marginLeft: '10px' }}>{field.label}</label>
            {!isConnected(field.id) &&
              React.createElement(field.component as any, {
                className: 'nodrag',
                value: data[field.id] ?? '',
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  updateNodeData(id, { [field.id]: e.target.value }),
                ...field.props,
              })}
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

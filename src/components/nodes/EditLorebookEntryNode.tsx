import React, { FC, useState, useEffect, useMemo } from 'react';
import { Handle, Position, useEdges, NodeProps, Node } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { EditLorebookEntryNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { getWorldInfo } from 'sillytavern-utils-lib';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';

export type EditLorebookEntryNodeProps = NodeProps<Node<EditLorebookEntryNodeData>>;

const optionalFields = [
  { id: 'key', label: 'New Keys (comma-separated)', component: STInput, props: { type: 'text' } },
  { id: 'comment', label: 'New Comment (Title)', component: STInput, props: { type: 'text' } },
  { id: 'content', label: 'New Content', component: STTextarea, props: { rows: 2 } },
] as const;

export const EditLorebookEntryNode: FC<EditLorebookEntryNodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useFlow();
  const edges = useEdges();
  const [allWorldsData, setAllWorldsData] = useState<Record<string, WIEntry[]>>({});

  useEffect(() => {
    getWorldInfo(['all']).then((worlds) => {
      setAllWorldsData(worlds);
    });
  }, []);

  const lorebookOptions = useMemo(
    () => Object.keys(allWorldsData).map((name) => ({ value: name, label: name })),
    [allWorldsData],
  );

  const entryOptions = useMemo(() => {
    if (!data.worldName || !allWorldsData[data.worldName]) return [];
    return allWorldsData[data.worldName].map((entry) => ({
      value: String(entry.uid),
      label: entry.comment || `Entry UID: ${entry.uid}`,
    }));
  }, [data.worldName, allWorldsData]);

  const isConnected = (fieldId: string) => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);

  return (
    <BaseNode id={id} title="Edit Lorebook Entry" selected={selected}>
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
              onChange={(e) => updateNodeData(id, { worldName: e[0], entryUid: undefined })}
              multiple={false}
              items={lorebookOptions}
              inputClasses="nodrag"
              containerClasses="nodrag"
              closeOnSelect={true}
              enableSearch={true}
            />
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="entryUid"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Entry to Edit</label>
          {!isConnected('entryUid') && (
            <STFancyDropdown
              value={[String(data.entryUid ?? '')]}
              onChange={(e) => updateNodeData(id, { entryUid: Number(e[0]) })}
              multiple={false}
              items={entryOptions}
              inputClasses="nodrag"
              containerClasses="nodrag"
              closeOnSelect={true}
              enableSearch={true}
              disabled={!data.worldName}
            />
          )}
        </div>
        <hr />
        <p style={{ margin: 0, textAlign: 'center' }}>Fields to Update (Optional)</p>
        {optionalFields.map((field) => (
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

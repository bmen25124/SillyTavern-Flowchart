import React, { FC, useState, useEffect, useMemo } from 'react';
import { Handle, Position, useEdges, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { GetLorebookEntryNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { getWorldInfos } from 'sillytavern-utils-lib';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import { shallow } from 'zustand/shallow';

export type GetLorebookEntryNodeProps = NodeProps<Node<GetLorebookEntryNodeData>>;

const outputFields = ['key', 'content', 'comment'] as const;

export const GetLorebookEntryNode: FC<GetLorebookEntryNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as GetLorebookEntryNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const edges = useEdges();
  const [allWorldsData, setAllWorldsData] = useState<Record<string, WIEntry[]>>({});

  useEffect(() => {
    getWorldInfos(['all']).then((worlds) => {
      setAllWorldsData(worlds);
    });
  }, []);

  const lorebookOptions = useMemo(
    () => Object.keys(allWorldsData).map((name) => ({ value: name, label: name })),
    [allWorldsData],
  );

  const entryOptions = useMemo(() => {
    if (!data?.worldName || !allWorldsData[data.worldName]) return [];
    return allWorldsData[data.worldName].map((entry) => ({
      value: String(entry.uid),
      label: entry.comment || `Entry UID: ${entry.uid}`,
    }));
  }, [data?.worldName, allWorldsData]);

  if (!data) return null;

  const isConnected = (fieldId: string) => edges.some((edge) => edge.target === id && edge.targetHandle === fieldId);

  return (
    <BaseNode id={id} title="Get Lorebook Entry" selected={selected}>
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
          <label style={{ marginLeft: '10px' }}>Entry</label>
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
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span>Entry (Full Object)</span>
          <Handle
            type="source"
            position={Position.Right}
            id="entry"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
        {outputFields.map((field) => (
          <div
            key={field}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}
          >
            <span style={{ textTransform: 'capitalize' }}>{field.replace('_', ' ')}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={field}
              style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
            />
          </div>
        ))}
      </div>
    </BaseNode>
  );
};

import React, { FC, useState, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { GetLorebookEntryNodeData } from '../../../flow-types.js';
import { BaseNode } from '../BaseNode.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { getWorldInfos } from 'sillytavern-utils-lib';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../registrator.js';
import { schemaToText } from '../../../utils/schema-inspector.js';

export type GetLorebookEntryNodeProps = NodeProps<Node<GetLorebookEntryNodeData>>;

const fields = [
  createFieldConfig({
    id: 'worldName',
    label: 'Lorebook Name',
    component: STFancyDropdown,
    props: {
      multiple: false,
      inputClasses: 'nodrag',
      containerClasses: 'nodrag',
      closeOnSelect: true,
      enableSearch: true,
    },
    customChangeHandler: (e: string[], { nodeId, updateNodeData }) => {
      updateNodeData(nodeId, { worldName: e[0], entryUid: undefined });
    },
    formatValue: (value) => [value ?? ''],
  }),
  createFieldConfig({
    id: 'entryUid',
    label: 'Entry',
    component: STFancyDropdown,
    props: {
      multiple: false,
      inputClasses: 'nodrag',
      containerClasses: 'nodrag',
      closeOnSelect: true,
      enableSearch: true,
    },
    getValueFromEvent: (e: string[]) => Number(e[0]),
    formatValue: (value) => [String(value ?? '')],
  }),
];

export const GetLorebookEntryNode: FC<GetLorebookEntryNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetLorebookEntryNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const [allWorldsData, setAllWorldsData] = useState<Record<string, WIEntry[]>>({});
  const definition = registrator.nodeDefinitionMap.get('getLorebookEntryNode');

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

  const dynamicFields = useMemo(
    () =>
      fields.map((field) => {
        if (field.id === 'worldName') {
          return { ...field, props: { ...field.props, items: lorebookOptions } };
        }
        if (field.id === 'entryUid') {
          return { ...field, props: { ...field.props, items: entryOptions, disabled: !data?.worldName } };
        }
        return field;
      }),
    [lorebookOptions, entryOptions, data?.worldName],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Get Lorebook Entry" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={dynamicFields} data={data} updateNodeData={updateNodeData} />
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        {definition.handles.outputs.map((handle) => {
          const schemaText = handle.schema ? schemaToText(handle.schema) : handle.type;
          const label = (handle.id ?? 'Result').replace('_', ' ');
          return (
            <div
              key={handle.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}
              title={schemaText}
            >
              <span style={{ textTransform: 'capitalize' }}>{label}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={handle.id}
                style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
              />
            </div>
          );
        })}
      </div>
    </BaseNode>
  );
};

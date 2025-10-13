import React, { FC, useState, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { EditLorebookEntryNodeData } from '../../../flow-types.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { getWorldInfos } from 'sillytavern-utils-lib';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';

export type EditLorebookEntryNodeProps = NodeProps<Node<EditLorebookEntryNodeData>>;

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
    label: 'Entry to Edit',
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
  createFieldConfig({ id: 'key', label: 'New Keys (comma-separated)', component: STInput, props: { type: 'text' } }),
  createFieldConfig({ id: 'comment', label: 'New Comment (Title)', component: STInput, props: { type: 'text' } }),
  createFieldConfig({ id: 'content', label: 'New Content', component: STTextarea, props: { rows: 2 } }),
];

export const EditLorebookEntryNode: FC<EditLorebookEntryNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as EditLorebookEntryNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
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

  if (!data) return null;

  return (
    <BaseNode id={id} title="Edit Lorebook Entry" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={dynamicFields} data={data} updateNodeData={updateNodeData} />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

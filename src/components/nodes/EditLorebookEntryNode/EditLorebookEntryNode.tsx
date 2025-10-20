import { FC, useState, useEffect, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { EditLorebookEntryNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { getWorldInfos } from 'sillytavern-utils-lib';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type EditLorebookEntryNodeProps = NodeProps<Node<EditLorebookEntryNodeData>>;

export const EditLorebookEntryNode: FC<EditLorebookEntryNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as EditLorebookEntryNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const [allWorldsData, setAllWorldsData] = useState<Record<string, WIEntry[]>>({});
  const definition = registrator.nodeDefinitionMap.get(type);

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

  const fields = useMemo(
    () => [
      createFieldConfig({
        id: 'worldName',
        label: 'Lorebook Name',
        component: STFancyDropdown,
        props: {
          items: lorebookOptions,
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
          items: entryOptions,
          multiple: false,
          inputClasses: 'nodrag',
          containerClasses: 'nodrag',
          closeOnSelect: true,
          enableSearch: true,
          disabled: !data?.worldName,
        },
        getValueFromEvent: (e: string[]) => Number(e[0]),
        formatValue: (value) => [String(value ?? '')],
      }),
      createFieldConfig({
        id: 'key',
        label: 'New Keys (comma-separated)',
        component: STInput,
        props: { type: 'text', placeholder: 'Leave blank to not change' },
      }),
      createFieldConfig({
        id: 'comment',
        label: 'New Comment (Title)',
        component: STInput,
        props: { type: 'text', placeholder: 'Leave blank to not change' },
      }),
      createFieldConfig({
        id: 'content',
        label: 'New Content',
        component: STTextarea,
        props: { rows: 2, placeholder: 'Leave blank to not change' },
      }),
    ],
    [lorebookOptions, entryOptions, data?.worldName],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Edit Lorebook Entry" selected={selected}>
      <NodeHandleRenderer
        nodeId={id}
        definition={definition}
        type="input"
        fields={fields}
        data={data}
        updateNodeData={updateNodeData}
      />
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};

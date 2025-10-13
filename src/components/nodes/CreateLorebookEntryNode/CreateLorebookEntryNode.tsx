import { FC, useState, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { CreateLorebookEntryNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { getWorldInfos } from 'sillytavern-utils-lib';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';

export type CreateLorebookEntryNodeProps = NodeProps<Node<CreateLorebookEntryNodeData>>;

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
    getValueFromEvent: (e: string[]) => e[0],
    formatValue: (value) => [value ?? ''],
  }),
  createFieldConfig({ id: 'key', label: 'Keys (comma-separated)', component: STInput, props: { type: 'text' } }),
  createFieldConfig({ id: 'comment', label: 'Comment (Title)', component: STInput, props: { type: 'text' } }),
  createFieldConfig({ id: 'content', label: 'Content', component: STTextarea, props: { rows: 2 } }),
];

export const CreateLorebookEntryNode: FC<CreateLorebookEntryNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as CreateLorebookEntryNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const [lorebookNames, setLorebookNames] = useState<string[]>([]);

  useEffect(() => {
    getWorldInfos(['all']).then((worlds) => {
      setLorebookNames(Object.keys(worlds));
    });
  }, []);

  const lorebookOptions = useMemo(() => lorebookNames.map((name) => ({ value: name, label: name })), [lorebookNames]);

  const dynamicFields = useMemo(
    () =>
      fields.map((field) => {
        if (field.id === 'worldName') {
          return { ...field, props: { ...field.props, items: lorebookOptions } };
        }
        return field;
      }),
    [lorebookOptions],
  );

  if (!data) return null;

  return (
    <BaseNode id={id} title="Create Lorebook Entry" selected={selected}>
      <NodeFieldRenderer
        nodeId={id}
        nodeType={type}
        fields={dynamicFields}
        data={data}
        updateNodeData={updateNodeData}
      />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

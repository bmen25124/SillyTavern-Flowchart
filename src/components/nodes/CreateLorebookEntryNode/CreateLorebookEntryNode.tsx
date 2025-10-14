import { FC, useState, useEffect, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { CreateLorebookEntryNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { getWorldInfos } from 'sillytavern-utils-lib';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type CreateLorebookEntryNodeProps = NodeProps<Node<CreateLorebookEntryNodeData>>;

export const CreateLorebookEntryNode: FC<CreateLorebookEntryNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as CreateLorebookEntryNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const [lorebookNames, setLorebookNames] = useState<string[]>([]);
  const definition = registrator.nodeDefinitionMap.get(type);

  useEffect(() => {
    getWorldInfos(['all']).then((worlds) => {
      setLorebookNames(Object.keys(worlds));
    });
  }, []);

  const lorebookOptions = useMemo(() => lorebookNames.map((name) => ({ value: name, label: name })), [lorebookNames]);

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
        getValueFromEvent: (e: string[]) => e[0],
        formatValue: (value) => [value ?? ''],
      }),
      createFieldConfig({ id: 'key', label: 'Keys (comma-separated)', component: STInput, props: { type: 'text' } }),
      createFieldConfig({ id: 'comment', label: 'Comment (Title)', component: STInput, props: { type: 'text' } }),
      createFieldConfig({ id: 'content', label: 'Content', component: STTextarea, props: { rows: 2 } }),
    ],
    [lorebookOptions],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Create Lorebook Entry" selected={selected}>
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

import { FC, useState, useEffect, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { GetLorebookNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { getWorldInfos } from 'sillytavern-utils-lib';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type GetLorebookNodeProps = NodeProps<Node<GetLorebookNodeData>>;

export const GetLorebookNode: FC<GetLorebookNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetLorebookNodeData;
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
    ],
    [lorebookOptions],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Get Lorebook" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeHandleRenderer
          nodeId={id}
          definition={definition}
          type="input"
          fields={fields}
          data={data}
          updateNodeData={updateNodeData}
        />
        <div style={{ borderTop: '1px solid #555', paddingTop: '10px' }}>
          <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
        </div>
      </div>
    </BaseNode>
  );
};

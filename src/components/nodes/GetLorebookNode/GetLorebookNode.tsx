import React, { FC, useState, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { GetLorebookNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { getWorldInfos } from 'sillytavern-utils-lib';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../registrator.js';
import { schemaToText } from '../../../utils/schema-inspector.js';

export type GetLorebookNodeProps = NodeProps<Node<GetLorebookNodeData>>;

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
];

export const GetLorebookNode: FC<GetLorebookNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetLorebookNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const [lorebookNames, setLorebookNames] = useState<string[]>([]);
  const definition = registrator.nodeDefinitionMap.get('getLorebookNode');
  const resultHandle = definition?.handles.outputs.find((h) => h.id === 'entries');
  const schemaText = resultHandle?.schema ? schemaToText(resultHandle.schema) : resultHandle?.type;

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
    <BaseNode id={id} title="Get Lorebook" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={dynamicFields} data={data} updateNodeData={updateNodeData} />
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} title={schemaText}>
          <span>Entries (Array)</span>
          <Handle
            type="source"
            position={Position.Right}
            id="entries"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
      </div>
    </BaseNode>
  );
};

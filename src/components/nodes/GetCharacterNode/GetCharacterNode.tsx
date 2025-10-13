import { FC, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { GetCharacterNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';
import { schemaToText } from '../../../utils/schema-inspector.js';

export type GetCharacterNodeProps = NodeProps<Node<GetCharacterNodeData>>;

const fields = [
  createFieldConfig({
    id: 'characterAvatar',
    label: 'Character',
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

export const GetCharacterNode: FC<GetCharacterNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetCharacterNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const { characters } = SillyTavern.getContext();
  const definition = registrator.nodeDefinitionMap.get('getCharacterNode');

  const characterOptions = useMemo(
    () => characters.map((c: any) => ({ value: c.avatar, label: c.name })),
    [characters],
  );

  const dynamicFields = useMemo(
    () =>
      fields.map((field) => {
        if (field.id === 'characterAvatar') {
          return { ...field, props: { ...field.props, items: characterOptions } };
        }
        return field;
      }),
    [characterOptions],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Get Character" selected={selected}>
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

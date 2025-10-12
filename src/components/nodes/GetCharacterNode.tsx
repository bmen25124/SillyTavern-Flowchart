import { FC, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { GetCharacterNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from './NodeFieldRenderer.js';
import { createFieldConfig } from './fieldConfig.js';

export type GetCharacterNodeProps = NodeProps<Node<GetCharacterNodeData>>;

const outputFields = ['name', 'description', 'first_mes', 'scenario', 'personality', 'mes_example', 'tags'] as const;

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

  if (!data) return null;

  return (
    <BaseNode id={id} title="Get Character" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={dynamicFields} data={data} updateNodeData={updateNodeData} />
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span>Result (Full Object)</span>
          <Handle
            type="source"
            position={Position.Right}
            id="result"
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

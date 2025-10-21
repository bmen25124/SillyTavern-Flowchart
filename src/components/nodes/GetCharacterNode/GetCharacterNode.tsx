import { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { GetCharacterNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type GetCharacterNodeProps = NodeProps<Node<GetCharacterNodeData>>;

export const GetCharacterNode: FC<GetCharacterNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetCharacterNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const { characters } = SillyTavern.getContext();
  const definition = registrator.nodeDefinitionMap.get(type);

  const characterOptions = useMemo(
    () => characters.map((c: any) => ({ value: c.avatar, label: c.name })),
    [characters],
  );

  const fields = useMemo(
    () => [
      createFieldConfig({
        id: 'characterAvatar',
        label: 'Character',
        component: STFancyDropdown,
        props: {
          items: characterOptions,
          multiple: false,
          inputClasses: 'nodrag',
          containerClasses: 'nodrag nowheel',
          closeOnSelect: true,
          enableSearch: true,
        },
        getValueFromEvent: (e: string[]) => e[0],
        formatValue: (value) => [value ?? ''],
      }),
    ],
    [characterOptions],
  );

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Get Character" selected={selected}>
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

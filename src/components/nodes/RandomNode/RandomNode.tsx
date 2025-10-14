import { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { RandomNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type RandomNodeProps = NodeProps<Node<RandomNodeData>>;

export const RandomNode: FC<RandomNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as RandomNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  const mode = data?.mode ?? 'number';

  const fields = useMemo(() => {
    const baseFields = [
      createFieldConfig({
        id: 'mode',
        label: 'Mode',
        component: STSelect,
        props: {
          children: (
            <>
              <option value="number">Number</option>
              <option value="array">From Array</option>
            </>
          ),
        },
      }),
    ];

    if (mode === 'number') {
      baseFields.push(
        createFieldConfig({
          id: 'min',
          label: 'Min',
          component: STInput,
          props: { type: 'number' },
          getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
        }),
        createFieldConfig({
          id: 'max',
          label: 'Max',
          component: STInput,
          props: { type: 'number' },
          getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
        }),
      );
    }
    // No fields for 'array' mode, as it's a connection-only input.
    return baseFields;
  }, [mode]);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Random" selected={selected}>
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

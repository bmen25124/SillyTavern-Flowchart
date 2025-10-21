import { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { ArrayToolsNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type ArrayToolsNodeProps = NodeProps<Node<ArrayToolsNodeData>>;

const allOperations = [
  'length',
  'get_by_index',
  'slice',
  'push',
  'pop',
  'shift',
  'unshift',
  'reverse',
  'includes',
] as const;

export const ArrayToolsNode: FC<ArrayToolsNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as ArrayToolsNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type)!;

  const operation = data?.operation ?? 'length';

  const fields = useMemo(() => {
    const baseFields = [
      createFieldConfig({
        id: 'operation',
        label: 'Operation',
        component: STSelect,
        props: {
          children: allOperations.map((op) => (
            <option key={op} value={op}>
              {op.replace(/_/g, ' ')}
            </option>
          )),
        },
      }),
    ];

    if (['get_by_index', 'slice'].includes(operation)) {
      baseFields.push(
        createFieldConfig({
          id: 'index',
          label: operation === 'slice' ? 'Start Index' : 'Index',
          component: STInput,
          props: { type: 'number' },
          getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
        }),
      );
    }
    if (operation === 'slice') {
      baseFields.push(
        createFieldConfig({
          id: 'endIndex',
          label: 'End Index (optional)',
          component: STInput,
          props: { type: 'number' },
          getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) =>
            e.target.value === '' ? undefined : Number(e.target.value),
        }),
      );
    }
    if (['push', 'unshift', 'includes'].includes(operation)) {
      baseFields.push(
        createFieldConfig({
          id: 'value',
          label: 'Value',
          component: STInput,
          props: { type: 'text' },
        }),
      );
    }

    return baseFields;
  }, [operation]);

  if (!data) return null;

  return (
    <BaseNode id={id} title="Array Tools" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeHandleRenderer
          nodeId={id}
          definition={definition}
          type="input"
          fields={fields}
          data={data}
          updateNodeData={updateNodeData}
        />
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};

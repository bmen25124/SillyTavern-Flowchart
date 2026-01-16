import { FC, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { StringToolsNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STSelect, STButton } from 'sillytavern-utils-lib/components/react';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type StringToolsNodeProps = NodeProps<Node<StringToolsNodeData>>;

const allOperations = [
  'merge',
  'split',
  'join',
  'toUpperCase',
  'toLowerCase',
  'trim',
  'replace',
  'replaceAll',
  'slice',
  'length',
  'startsWith',
  'endsWith',
] as const;

export const StringToolsNode: FC<StringToolsNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as StringToolsNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type)!;

  const inputCount = data?.inputCount ?? 2;
  const operation = data?.operation ?? 'merge';

  const fields = useMemo(() => {
    const baseFields = [
      createFieldConfig({
        id: 'operation',
        label: 'Operation',
        component: STSelect,
        options: allOperations.map((op) => ({ value: op, label: op })),
      }),
    ];

    if (['merge', 'split', 'join'].includes(operation)) {
      baseFields.push(
        createFieldConfig({
          id: 'delimiter',
          label: 'Delimiter',
          component: STInput,
          props: { type: 'text' },
        }),
      );
    }
    if (['replace', 'replaceAll', 'startsWith', 'endsWith'].includes(operation)) {
      baseFields.push(
        createFieldConfig({
          id: 'searchValue',
          label: 'Search Value',
          component: STInput,
          props: { type: 'text' },
        }),
      );
    }
    if (['replace', 'replaceAll'].includes(operation)) {
      baseFields.push(
        createFieldConfig({
          id: 'replaceValue',
          label: 'Replace Value',
          component: STInput,
          props: { type: 'text' },
        }),
      );
    }
    if (operation === 'slice') {
      baseFields.push(
        createFieldConfig({
          id: 'index',
          label: 'Start Index',
          component: STInput,
          props: { type: 'number' },
          getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
        }),
        createFieldConfig({
          id: 'count',
          label: 'End Index (optional)',
          component: STInput,
          props: { type: 'number' },
          getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) =>
            e.target.value === '' ? undefined : Number(e.target.value),
        }),
      );
    }

    return baseFields;
  }, [operation]);

  if (!data) return null;

  const setInputCount = (count: number) => {
    updateNodeData(id, { inputCount: Math.max(1, count) });
  };

  return (
    <BaseNode id={id} title="String Tools" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeHandleRenderer
          nodeId={id}
          definition={definition}
          type="input"
          fields={fields}
          data={data}
          updateNodeData={updateNodeData}
        />

        {operation === 'merge' && (
          <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
            <STButton onClick={() => setInputCount(inputCount + 1)}>+</STButton>
            <STButton onClick={() => setInputCount(inputCount - 1)} disabled={inputCount <= 1}>
              -
            </STButton>
          </div>
        )}
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};

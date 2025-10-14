import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { MathNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type MathNodeProps = NodeProps<Node<MathNodeData>>;

const operations = ['add', 'subtract', 'multiply', 'divide', 'modulo'] as const;

const fields = [
  createFieldConfig({
    id: 'operation',
    label: 'Operation',
    component: STSelect,
    props: {
      children: operations.map((op) => (
        <option key={op} value={op} style={{ textTransform: 'capitalize' }}>
          {op}
        </option>
      )),
    },
  }),
  createFieldConfig({
    id: 'a',
    label: 'Value A',
    component: STInput,
    props: { type: 'number' },
    getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
  }),
  createFieldConfig({
    id: 'b',
    label: 'Value B',
    component: STInput,
    props: { type: 'number' },
    getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
  }),
];

export const MathNode: FC<MathNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as MathNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Math Operation" selected={selected}>
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

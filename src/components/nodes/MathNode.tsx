import { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { MathNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from './NodeFieldRenderer.js';
import { createFieldConfig } from './fieldConfig.js';
import { nodeDefinitionMap } from './definitions/index.js';
import { schemaToText } from '../../utils/schema-inspector.js';

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

export const MathNode: FC<MathNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as MathNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = nodeDefinitionMap.get('mathNode');
  const resultHandle = definition?.handles.outputs.find((h) => h.id === 'result');
  const schemaText = resultHandle?.schema ? schemaToText(resultHandle.schema) : resultHandle?.type;

  if (!data) return null;

  return (
    <BaseNode id={id} title="Math Operation" selected={selected}>
      <NodeFieldRenderer nodeId={id} fields={fields} data={data} updateNodeData={updateNodeData} />
      <div
        style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}
        title={schemaText}
      >
        <span>Result</span>
        <Handle
          type="source"
          position={Position.Right}
          id="result"
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    </BaseNode>
  );
};

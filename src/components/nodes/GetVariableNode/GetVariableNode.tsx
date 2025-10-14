import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { GetVariableNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type GetVariableNodeProps = NodeProps<Node<GetVariableNodeData>>;

const fields = [
  createFieldConfig({
    id: 'variableName',
    label: 'Variable Name',
    component: STInput,
    props: { type: 'text' },
  }),
];

export const GetVariableNode: FC<GetVariableNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as GetVariableNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Get Variable" selected={selected}>
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

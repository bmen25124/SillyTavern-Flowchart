import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from '../BaseNode.js';
import { useFlowStore } from '../../popup/flowStore.js';
import { STTextarea } from 'sillytavern-utils-lib/components';
import { createFieldConfig } from '../fieldConfig.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { registrator } from '../autogen-imports.js';
import { ConfirmUserNodeData } from './definition.js';

export type ConfirmUserNodeProps = NodeProps<Node<ConfirmUserNodeData>>;

const fields = [
  createFieldConfig({
    id: 'message',
    label: 'Confirmation Message',
    component: STTextarea,
    props: { rows: 3 },
  }),
];

export const ConfirmUserNode: FC<ConfirmUserNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as ConfirmUserNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Confirm With User" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeHandleRenderer
          nodeId={id}
          definition={definition}
          type="input"
          fields={fields}
          data={data}
          updateNodeData={updateNodeData}
        />

        <div style={{ borderTop: '1px solid #555', paddingTop: '10px', marginTop: '5px' }}>
          <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
        </div>
      </div>
    </BaseNode>
  );
};

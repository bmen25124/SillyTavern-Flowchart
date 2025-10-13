import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { NumberNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { schemaToText } from '../../../utils/schema-inspector.js';
import { registrator } from '../autogen-imports.js';
import { useIsConnected } from '../../../hooks/useIsConnected.js';
import { FlowDataTypeColors } from '../../../flow-types.js';

export type NumberNodeProps = NodeProps<Node<NumberNodeData>>;

const fields = [
  createFieldConfig({
    id: 'value',
    label: 'Value',
    component: STInput,
    props: { type: 'number' },
    getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => (e.target.value === '' ? 0 : Number(e.target.value)),
  }),
];

export const NumberNode: FC<NumberNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as NumberNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('numberNode');
  const resultHandle = definition?.handles.outputs.find((h) => h.id === 'value');
  const schemaText = resultHandle?.schema ? schemaToText(resultHandle.schema) : resultHandle?.type;
  const isValueConnected = useIsConnected(id, 'value');

  if (!data) return null;

  return (
    <BaseNode id={id} title="Number" selected={selected}>
      {!isValueConnected ? (
        <NodeFieldRenderer nodeId={id} nodeType={type} fields={fields} data={data} updateNodeData={updateNodeData} />
      ) : (
        <div style={{ position: 'relative', padding: '5px 0' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="value"
            style={{ top: '50%', transform: 'translateY(-50%)', backgroundColor: FlowDataTypeColors.any }}
          />
          <label style={{ marginLeft: '10px' }}>Value</label>
          <span className="handle-label">(any)</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <div>
          <span>Value</span>
          <span className="handle-label">(number)</span>
        </div>
        <Handle
          type="source"
          position={Position.Right}
          id="value"
          title={schemaText}
          style={{
            position: 'relative',
            transform: 'none',
            right: 0,
            top: 0,
            backgroundColor: FlowDataTypeColors.number,
          }}
        />
      </div>
    </BaseNode>
  );
};

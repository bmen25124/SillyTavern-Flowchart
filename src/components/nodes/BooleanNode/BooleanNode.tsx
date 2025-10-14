import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { BooleanNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STSelect } from 'sillytavern-utils-lib/components';
import { NodeFieldRenderer } from '../NodeFieldRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { useIsConnected } from '../../../hooks/useIsConnected.js';
import { FlowDataTypeColors } from '../../../flow-types.js';

export type BooleanNodeProps = NodeProps<Node<BooleanNodeData>>;

const fields = [
  createFieldConfig({
    id: 'value',
    label: 'Value',
    component: STSelect,
    props: {
      children: (
        <>
          <option value="true">True</option>
          <option value="false">False</option>
        </>
      ),
    },
    // Convert the string from the <select> element back to a boolean for the state
    getValueFromEvent: (e: React.ChangeEvent<HTMLSelectElement>) => e.target.value === 'true',
    // Convert the boolean from the state to a string for the <select> element's value
    formatValue: (value: boolean) => String(value),
  }),
];

export const BooleanNode: FC<BooleanNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as BooleanNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const isValueConnected = useIsConnected(id, 'value');

  if (!data) return null;

  return (
    <BaseNode id={id} title="Boolean" selected={selected}>
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
          <span className="handle-label">(boolean)</span>
        </div>
        <Handle
          type="source"
          position={Position.Right}
          id="value"
          style={{
            position: 'relative',
            transform: 'none',
            right: 0,
            top: 0,
            backgroundColor: FlowDataTypeColors.boolean,
          }}
        />
      </div>
    </BaseNode>
  );
};

import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { BaseNode } from './BaseNode.js';
import { useFlowStore } from '../popup/flowStore.js';
import { TypeConverterNodeData } from '../../flow-types.js';
import { STSelect } from 'sillytavern-utils-lib/components';
import { shallow } from 'zustand/shallow';

export type TypeConverterNodeProps = NodeProps<Node<TypeConverterNodeData>>;

export const TypeConverterNode: FC<TypeConverterNodeProps> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as TypeConverterNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );

  if (!data) return null;

  return (
    <BaseNode id={id} title="Type Converter" selected={selected}>
      <Handle type="target" position={Position.Left} id="value" />
      <div>
        <label>Convert To</label>
        <STSelect
          className="nodrag"
          value={data.targetType}
          onChange={(e) => updateNodeData(id, { targetType: e.target.value as any })}
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="object">Object (from JSON string)</option>
          <option value="array">Array (from JSON string)</option>
        </STSelect>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}>
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

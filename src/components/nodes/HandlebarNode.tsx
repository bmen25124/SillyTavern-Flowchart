import React, { FC } from 'react';
import { Handle, Position, useEdges, NodeProps, Node } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { HandlebarNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STTextarea } from 'sillytavern-utils-lib/components';

export type HandlebarNodeProps = NodeProps<Node<HandlebarNodeData>>;

export const HandlebarNode: FC<HandlebarNodeProps> = ({ id, data, selected }) => {
  const { updateNodeData } = useFlow();
  const edges = useEdges();

  const isTemplateConnected = edges.some((edge) => edge.target === id && edge.targetHandle === 'template');
  const isDataConnected = edges.some((edge) => edge.target === id && edge.targetHandle === 'data');

  return (
    <BaseNode id={id} title="Handlebar Template" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="template"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Template</label>
          {!isTemplateConnected && (
            <STTextarea
              className="nodrag"
              value={data.template}
              onChange={(e) => updateNodeData(id, { template: e.target.value })}
              rows={4}
            />
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <Handle
            type="target"
            position={Position.Left}
            id="data"
            style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
          />
          <label style={{ marginLeft: '10px' }}>Data (Context)</label>
          {!isDataConnected && <span style={{ fontSize: '10px', color: '#888' }}> (Requires connection)</span>}
        </div>
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Result</span>
          <Handle
            type="source"
            position={Position.Right}
            id="result"
            style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
          />
        </div>
      </div>
    </BaseNode>
  );
};

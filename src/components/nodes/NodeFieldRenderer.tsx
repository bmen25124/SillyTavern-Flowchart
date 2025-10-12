import React, { FC } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useConnectedHandles } from '../../hooks/useConnectedHandles.js';
import { FieldConfig } from './fieldConfig.js';

interface NodeFieldRendererProps {
  nodeId: string;
  fields: readonly FieldConfig[];
  data: Record<string, any>;
  updateNodeData: (id: string, data: object) => void;
}

export const NodeFieldRenderer: FC<NodeFieldRendererProps> = React.memo(({ nodeId, fields, data, updateNodeData }) => {
  const connectedHandles = useConnectedHandles(nodeId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {fields.map((field) => {
        const isConnected = connectedHandles.has(field.id);

        const handleChange = (event: any) => {
          if (field.customChangeHandler) {
            field.customChangeHandler(event, { nodeId, updateNodeData });
          } else {
            const value = field.getValueFromEvent ? field.getValueFromEvent(event) : event.target.value;
            updateNodeData(nodeId, { [field.id]: value });
          }
        };

        return (
          <div key={field.id} style={{ position: 'relative' }}>
            <Handle
              type="target"
              position={Position.Left}
              id={field.id}
              style={{ top: '0.5rem', transform: 'translateY(-50%)' }}
            />
            <label style={{ marginLeft: '10px' }}>{field.label}</label>
            {!isConnected &&
              React.createElement(field.component, {
                className: 'nodrag',
                value: field.formatValue ? field.formatValue(data[field.id]) : (data[field.id] ?? ''),
                onChange: handleChange,
                ...field.props,
              })}
          </div>
        );
      })}
    </div>
  );
});

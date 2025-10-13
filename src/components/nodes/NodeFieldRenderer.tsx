import React, { FC } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useConnectedHandles } from '../../hooks/useConnectedHandles.js';
import { FieldConfig } from './fieldConfig.js';
import { registrator } from './autogen-imports.js';
import { FlowDataType, FlowDataTypeColors } from '../../flow-types.js';

interface NodeFieldRendererProps {
  nodeId: string;
  nodeType: string;
  fields: readonly FieldConfig[];
  data: Record<string, any>;
  updateNodeData: (id: string, data: object) => void;
}

export const NodeFieldRenderer: FC<NodeFieldRendererProps> = React.memo(
  ({ nodeId, nodeType, fields, data, updateNodeData }) => {
    const connectedHandles = useConnectedHandles(nodeId);
    const definition = registrator.nodeDefinitionMap.get(nodeType);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {fields.map((field) => {
          const isConnected = connectedHandles.has(field.id);
          const handleSpec = definition?.handles.inputs.find((h) => h.id === field.id);
          const handleType = handleSpec?.type ?? FlowDataType.ANY;

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
                style={{
                  top: '0.5rem',
                  transform: 'translateY(-50%)',
                  backgroundColor: FlowDataTypeColors[handleType],
                }}
              />
              <label style={{ marginLeft: '10px' }}>{field.label}</label>
              <span className="handle-label">({handleType})</span>

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
  },
);

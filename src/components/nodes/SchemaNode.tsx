import React, { FC } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { SchemaNodeData } from '../../flow-types.js';
import { BaseNode } from './BaseNode.js';
import { STInput, STButton, STSelect } from 'sillytavern-utils-lib/components';

export type SchemaNodeProps = {
  id: string;
  data: SchemaNodeData;
};

export const SchemaNode: FC<SchemaNodeProps> = ({ id, data }) => {
  const { updateNodeData } = useFlow();

  const handleFieldChange = (fieldId: string, field: { name: string; type: 'string' | 'number' | 'boolean' }) => {
    const newFields = data.fields.map((f) => (f.id === fieldId ? { ...f, ...field } : f));
    updateNodeData(id, { fields: newFields });
  };

  const addField = () => {
    const newField = { id: crypto.randomUUID(), name: 'newField', type: 'string' as const };
    updateNodeData(id, { fields: [...(data.fields || []), newField] });
  };

  const removeField = (fieldId: string) => {
    const newFields = data.fields.filter((f) => f.id !== fieldId);
    updateNodeData(id, { fields: newFields });
  };

  return (
    <BaseNode id={id} title="Schema">
      <div style={{ width: 300 }}>
        <label>Fields</label>
        {(data.fields || []).map((field) => (
          <div key={field.id} style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
            <STInput
              value={field.name}
              onChange={(e) => handleFieldChange(field.id, { name: e.target.value, type: field.type })}
            />
            <STSelect
              value={field.type}
              onChange={(e) =>
                handleFieldChange(field.id, {
                  name: field.name,
                  type: e.target.value as 'string' | 'number' | 'boolean',
                })
              }
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
            </STSelect>
            <STButton onClick={() => removeField(field.id)}>Remove</STButton>
          </div>
        ))}
        <STButton onClick={addField} style={{ marginTop: '10px' }}>
          Add Field
        </STButton>
      </div>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

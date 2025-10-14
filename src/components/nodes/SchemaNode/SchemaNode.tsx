import React, { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { SchemaNodeData, FieldDefinition, SchemaTypeDefinition } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STButton, STSelect, STTextarea } from 'sillytavern-utils-lib/components';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { registrator } from '../autogen-imports.js';

export type SchemaNodeProps = NodeProps<Node<SchemaNodeData>>;

type FieldEditorProps = {
  definition: FieldDefinition | SchemaTypeDefinition;
  path: (string | number)[];
  onUpdate: (path: (string | number)[], data: Partial<FieldDefinition | SchemaTypeDefinition>) => void;
  onRemove?: (path: (string | number)[]) => void;
  onAddChild?: (path: (string | number)[]) => void;
};

const FieldEditor: FC<FieldEditorProps> = ({ definition, path, onUpdate, onRemove, onAddChild }) => {
  const { name } = definition as FieldDefinition;
  const { type, description, values, fields, items } = definition;

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as SchemaTypeDefinition['type'];
    const newProps: Partial<SchemaTypeDefinition> = { type: newType };

    if (newType === 'object' && !fields) newProps.fields = [];
    if (newType === 'array' && !items) newProps.items = { type: 'string' };
    if (newType === 'enum' && !values) newProps.values = ['option1', 'option2'];

    onUpdate(path, newProps);
  };

  const handleValueChange = (index: number, value: string) => {
    const newValues = [...(values || [])];
    newValues[index] = value;
    onUpdate(path, { values: newValues });
  };

  const addValue = () => onUpdate(path, { values: [...(values || []), 'newValue'] });
  const removeValue = (index: number) => onUpdate(path, { values: values?.filter((_, i) => i !== index) });

  return (
    <div
      style={{
        marginLeft: path.length > 2 ? '15px' : '0',
        marginTop: '5px',
        paddingTop: '5px',
        borderLeft: path.length > 2 ? '1px solid #444' : 'none',
        paddingLeft: path.length > 2 ? '5px' : '0',
      }}
    >
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        {name !== undefined && (
          <STInput
            className="nodrag"
            value={name}
            onChange={(e) => onUpdate(path, { name: e.target.value })}
            placeholder="Field Name"
          />
        )}
        <STSelect className="nodrag" value={type} onChange={handleTypeChange}>
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
          <option value="object">object</option>
          <option value="array">array</option>
          <option value="enum">enum</option>
        </STSelect>
        {onRemove && <STButton onClick={() => onRemove(path)}>✕</STButton>}
      </div>
      <STTextarea
        className="nodrag"
        value={description || ''}
        onChange={(e) => onUpdate(path, { description: e.target.value })}
        placeholder="Description..."
        rows={2}
        style={{ marginTop: '5px' }}
      />

      {type === 'enum' && (
        <div style={{ marginLeft: '10px', marginTop: '5px' }}>
          {(values || []).map((val, i) => (
            <div key={i} style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
              <STInput className="nodrag" value={val} onChange={(e) => handleValueChange(i, e.target.value)} />
              <STButton onClick={() => removeValue(i)}>✕</STButton>
            </div>
          ))}
          <STButton onClick={addValue} style={{ marginTop: '5px' }}>
            + Value
          </STButton>
        </div>
      )}

      {type === 'object' && (
        <div style={{ marginLeft: '10px', marginTop: '5px' }}>
          {(fields || []).map((field, i) => (
            <FieldEditor
              key={field.id}
              definition={field}
              path={[...path, 'fields', i]}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAddChild={onAddChild}
            />
          ))}
          {onAddChild && (
            <STButton onClick={() => onAddChild(path)} style={{ marginTop: '5px' }}>
              + Field
            </STButton>
          )}
        </div>
      )}

      {type === 'array' && items && (
        <div style={{ marginLeft: '10px', marginTop: '5px' }}>
          <span>Items:</span>
          <FieldEditor
            definition={items}
            path={[...path, 'items']}
            onUpdate={onUpdate}
            onAddChild={onAddChild}
            onRemove={onRemove}
          />
        </div>
      )}
    </div>
  );
};

export const SchemaNode: FC<SchemaNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as SchemaNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);

  if (!data || !definition) return null;

  const updateNested = (obj: any, path: (string | number)[], updater: (item: any) => any) => {
    const newObj = structuredClone(obj);
    let current = newObj;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    const finalKey = path[path.length - 1];
    current[finalKey] = updater(current[finalKey]);
    return newObj;
  };

  const handleUpdate = (path: (string | number)[], newPartialData: object) => {
    const newFields = updateNested(data.fields, path, (item: object) => ({ ...item, ...newPartialData }));
    updateNodeData(id, { fields: newFields });
  };

  const handleRemove = (path: (string | number)[]) => {
    const parentPath = path.slice(0, -2);
    const containerKey = path[path.length - 2] as string;
    const indexToRemove = path[path.length - 1] as number;

    let newFields;
    if (parentPath.length === 0) {
      newFields = data.fields.filter((_, i) => i !== indexToRemove);
    } else {
      newFields = updateNested(data.fields, [...parentPath, containerKey], (items: any[]) =>
        items.filter((_, i) => i !== indexToRemove),
      );
    }
    updateNodeData(id, { fields: newFields });
  };

  const handleAddChild = (path: (string | number)[]) => {
    const newField: FieldDefinition = { id: crypto.randomUUID(), name: 'newField', type: 'string' };
    const newFields = updateNested(data.fields, [...path, 'fields'], (items: any[]) => [...(items || []), newField]);
    updateNodeData(id, { fields: newFields });
  };

  const addRootField = () => {
    const newField = { id: crypto.randomUUID(), name: 'newField', type: 'string' as const };
    updateNodeData(id, { fields: [...(data.fields || []), newField] });
  };

  return (
    <BaseNode id={id} title="Schema" selected={selected}>
      {(data.fields || []).map((field, index) => (
        <FieldEditor
          key={field.id}
          definition={field}
          path={[index]}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          onAddChild={handleAddChild}
        />
      ))}
      <STButton className="nodrag" onClick={addRootField} style={{ marginTop: '10px' }}>
        Add Field
      </STButton>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};

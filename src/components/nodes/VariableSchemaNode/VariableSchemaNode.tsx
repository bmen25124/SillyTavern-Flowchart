import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { VariableSchemaNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STButton, STSelect } from 'sillytavern-utils-lib/components/react';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { registrator } from '../autogen-imports.js';
import { FieldEditor } from '../SchemaNode/SchemaNode.js';
import { generateUUID } from '../../../utils/uuid.js';
import { SchemaTypeDefinition, schemaNodeDefinition } from '../SchemaNode/definition.js';
import { updateNested } from '../../../utils/nested-logic.js';

export type VariableSchemaNodeProps = NodeProps<Node<VariableSchemaNodeData>>;

export const VariableSchemaNode: FC<VariableSchemaNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as VariableSchemaNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);
  const availableSchemas = (schemaNodeDefinition.meta as any)?.schemas ?? {};

  if (!data || !definition) return null;

  const rootDefinition = data.definition;

  const handleUpdate = (path: (string | number)[], partial: Record<string, any>) => {
    let updatedDefinition: SchemaTypeDefinition;
    if (path.length === 0) {
      updatedDefinition = { ...rootDefinition, ...partial };
    } else {
      updatedDefinition = updateNested(rootDefinition, path, (item: SchemaTypeDefinition) => ({
        ...item,
        ...partial,
      }));
    }
    updateNodeData(id, { definition: updatedDefinition });
  };

  const handleRemove = (path: (string | number)[]) => {
    const parentPath = path.slice(0, -2);
    const containerKey = path[path.length - 2] as string;
    const indexToRemove = path[path.length - 1] as number;

    if (parentPath.length === 0 && containerKey === 'fields') {
      const newFields = (rootDefinition.fields || []).filter((_: any, i: number) => i !== indexToRemove);
      updateNodeData(id, { definition: { ...rootDefinition, fields: newFields } });
      return;
    }

    const updatedDefinition = updateNested(rootDefinition, [...parentPath, containerKey], (items: any[]) =>
      (items || []).filter((_: unknown, i: number) => i !== indexToRemove),
    );
    updateNodeData(id, { definition: updatedDefinition });
  };

  const handleRemoveWithGuard = (path: (string | number)[]) => {
    if (path.length === 0) return;
    handleRemove(path);
  };

  const handleAddChild = (path: (string | number)[]) => {
    const newField = { id: generateUUID(), name: 'field', type: 'string' as const, required: true };
    const updatedDefinition = updateNested(rootDefinition, [...path, 'fields'], (items: any[]) => [
      ...(items || []),
      newField,
    ]);
    updateNodeData(id, { definition: updatedDefinition });
  };

  const ensureObjectRoot = () => {
    if (rootDefinition.type !== 'object') {
      updateNodeData(id, { definition: { type: 'object', fields: [], required: true } });
    }
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'custom') {
      updateNodeData(id, { mode: 'custom' });
    } else {
      updateNodeData(id, { mode: 'predefined', selectedSchema: value });
    }
  };

  return (
    <BaseNode id={id} title="Variable Schema" selected={selected}>
      <STSelect
        className="nodrag"
        value={data.mode === 'custom' ? 'custom' : data.selectedSchema}
        onChange={handleModeChange}
      >
        <optgroup label="Custom">
          <option value="custom">Custom Schema</option>
        </optgroup>
        <optgroup label="Predefined">
          {Object.keys(availableSchemas).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </optgroup>
      </STSelect>

      {data.mode === 'custom' && (
        <>
          <FieldEditor
            definition={rootDefinition}
            path={[]}
            onUpdate={handleUpdate}
            onRemove={handleRemoveWithGuard}
            onAddChild={handleAddChild}
          />
          <STButton className="nodrag" onClick={ensureObjectRoot} style={{ marginTop: '10px' }}>
            Set To Object Root
          </STButton>
        </>
      )}

      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};

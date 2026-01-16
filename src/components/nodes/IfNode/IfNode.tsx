import { useMemo, FC } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useFlowStore } from '../../popup/flowStore.js';
import { STButton, STInput, STSelect } from 'sillytavern-utils-lib/components/react';
import { BaseNode } from '../BaseNode.js';
import { IfNodeData, Condition, OPERATORS, Operator } from './definition.js';
import { useInputSchema } from '../../../hooks/useInputSchema.js';
import { z } from 'zod';
import { schemaToText, flattenZodSchema } from '../../../utils/schema-inspector.js';
import { ComboBoxInput } from '../../popup/ComboBoxInput.js';
import { registrator } from '../autogen-imports.js';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { generateUUID } from '../../../utils/uuid.js';
import { useConnectedHandles } from '../../../hooks/useConnectedHandles.js';

const UNARY_OPERATORS: Operator[] = ['is_empty', 'is_not_empty'];

const ConditionEditor: FC<{
  nodeId: string;
  condition: Condition;
  onUpdate: (updatedPartialCondition: Partial<Condition>) => void;
  onRemove: () => void;
  isOnlyCondition: boolean;
  isInputAnObject: boolean;
  availableProperties: string[];
  connectedHandles: Set<string>;
}> = ({
  nodeId,
  condition,
  onUpdate,
  onRemove,
  isOnlyCondition,
  isInputAnObject,
  availableProperties,
  connectedHandles,
}) => {
  const isValueConnected = connectedHandles.has(`value_${condition.id}`);
  const showValueInput = !UNARY_OPERATORS.includes(condition.operator);

  const toggleMode = () => {
    onUpdate({ mode: condition.mode === 'simple' ? 'advanced' : 'simple' });
  };

  return (
    <div
      style={{
        border: '1px solid #555',
        padding: '8px',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#888', textTransform: 'capitalize' }}>{condition.mode} Mode</span>
        <div style={{ display: 'flex', gap: '5px' }}>
          <STButton
            className={`fa-solid ${condition.mode === 'simple' ? 'fa-code' : 'fa-list-alt'}`}
            onClick={toggleMode}
            title={condition.mode === 'simple' ? 'Switch to Advanced Code Editor' : 'Switch to Simple UI Editor'}
          />
          {!isOnlyCondition && <STButton className="fa-solid fa-times" onClick={onRemove} title="Remove Condition" />}
        </div>
      </div>

      {condition.mode === 'simple' ? (
        <>
          {isInputAnObject && (
            <ComboBoxInput
              className="nodrag"
              value={condition.inputProperty}
              onChange={(e) => onUpdate({ inputProperty: e.target.value })}
              options={availableProperties}
              listId={`${condition.id}-properties`}
              placeholder="Property path (e.g., name)"
            />
          )}
          <STSelect
            className="nodrag"
            value={condition.operator}
            onChange={(e) => onUpdate({ operator: e.target.value as Operator })}
          >
            {OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op.replace(/_/g, ' ')}
              </option>
            ))}
          </STSelect>
          {showValueInput && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Handle
                type="target"
                position={Position.Left}
                id={`value_${condition.id}`}
                style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
              />
              {!isValueConnected ? (
                <STInput
                  className="nodrag"
                  value={condition.value ?? ''}
                  onChange={(e) => onUpdate({ value: e.target.value })}
                  placeholder="Value to compare"
                />
              ) : (
                <label style={{ marginLeft: '10px', color: '#888', fontStyle: 'italic' }}>Value from connection</label>
              )}
            </div>
          )}
        </>
      ) : (
        <CodeMirror
          className="nodrag nowheel"
          value={condition.code || ''}
          height="100px"
          extensions={[javascript({})]}
          onChange={(value) => onUpdate({ code: value })}
          theme={'dark'}
          style={{ cursor: 'text' }}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <span>True</span>
        <Handle
          type="source"
          position={Position.Right}
          id={condition.id}
          style={{ position: 'relative', transform: 'none', right: 0, top: 0, marginLeft: '5px' }}
        />
      </div>
    </div>
  );
};

export const IfNode: FC<NodeProps<Node<IfNodeData>>> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as IfNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get(type);
  const inputSchema = useInputSchema(id, 'value');
  const connectedHandles = useConnectedHandles(id);

  const isInputAnObject = useMemo(() => inputSchema instanceof z.ZodObject, [inputSchema]);
  const availableProperties = useMemo(() => {
    if (!isInputAnObject || !inputSchema) return [];
    return flattenZodSchema(inputSchema);
  }, [inputSchema, isInputAnObject]);

  const topLevelInputFields = useMemo(
    () => [
      createFieldConfig({ id: 'main', label: 'Main', component: () => null }),
      createFieldConfig({ id: 'value', label: 'Input Value', component: () => null }),
    ],
    [],
  );

  if (!data || !definition) return null;

  const updateCondition = (conditionId: string, updatedPartialCondition: Partial<Condition>) => {
    const newConditions = data.conditions.map((c) => (c.id === conditionId ? { ...c, ...updatedPartialCondition } : c));
    updateNodeData(id, { conditions: newConditions });
  };

  const addCondition = () => {
    const newCondition = {
      id: generateUUID(),
      mode: 'simple' as const,
      inputProperty: '',
      operator: 'equals' as const,
      value: '',
      code: 'return true;',
    };
    updateNodeData(id, { conditions: [...data.conditions, newCondition] });
  };

  const removeCondition = (conditionId: string) => {
    const newConditions = data.conditions.filter((c) => c.id !== conditionId);
    updateNodeData(id, { conditions: newConditions });
  };

  return (
    <BaseNode id={id} title="If Conditions" selected={selected}>
      <NodeHandleRenderer
        nodeId={id}
        definition={definition}
        type="input"
        fields={topLevelInputFields}
        data={{}}
        exclude={data.conditions.map((c) => `value_${c.id}`)}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        {data.conditions.map((condition, index) => (
          <div key={condition.id}>
            <label style={{ fontSize: '10px', color: '#888' }}>Condition {index + 1}</label>
            <ConditionEditor
              nodeId={id}
              condition={condition}
              onUpdate={(updatedPartial) => updateCondition(condition.id, updatedPartial)}
              onRemove={() => removeCondition(condition.id)}
              isOnlyCondition={data.conditions.length === 1}
              isInputAnObject={isInputAnObject}
              availableProperties={availableProperties}
              connectedHandles={connectedHandles}
            />
          </div>
        ))}
        <STButton onClick={addCondition}>Add Else If</STButton>

        {isInputAnObject && inputSchema && (
          <details style={{ marginTop: '5px', background: '#2a2a2a', padding: '5px', borderRadius: '3px' }}>
            <summary style={{ color: '#888', fontSize: '11px', cursor: 'pointer' }}>Available Input Properties</summary>
            <pre style={{ fontSize: '10px', color: '#ccc', margin: 0, whiteSpace: 'pre-wrap' }}>
              {schemaToText(inputSchema)}
            </pre>
          </details>
        )}

        <div className="node-output-section">
          <NodeHandleRenderer
            nodeId={id}
            definition={definition}
            type="output"
            exclude={data.conditions.map((c) => c.id)}
          />
        </div>
      </div>
    </BaseNode>
  );
};

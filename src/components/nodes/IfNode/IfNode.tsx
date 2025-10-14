import { useMemo, useEffect, FC } from 'react';
import { Handle, Position, Node, NodeProps, useEdges } from '@xyflow/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useFlowStore } from '../../popup/flowStore.js';
import { STButton, STInput, STSelect } from 'sillytavern-utils-lib/components';
import { BaseNode } from '../BaseNode.js';
import { IfNodeData, Condition, OPERATORS, Operator } from './definition.js';
import { useInputSchema } from '../../../hooks/useInputSchema.js';
import { z } from 'zod';
import { useIsConnected } from '../../../hooks/useIsConnected.js';
import { schemaToText, flattenZodSchema } from '../../../utils/schema-inspector.js';
import { ComboBoxInput } from '../../popup/ComboBoxInput.js';

const ConditionEditor: FC<{
  nodeId: string;
  condition: Condition;
  onUpdate: (updatedPartialCondition: Partial<Condition>) => void;
  onRemove: () => void;
  isOnlyCondition: boolean;
  isInputAnObject: boolean;
  availableProperties: string[];
}> = ({ nodeId, condition, onUpdate, onRemove, isOnlyCondition, isInputAnObject, availableProperties }) => {
  const isValueConnected = useIsConnected(nodeId, `value_${condition.id}`);

  const toggleMode = () => {
    if (condition.mode === 'advanced') {
      onUpdate({
        mode: 'simple',
      });
    } else {
      onUpdate({ mode: 'advanced' });
    }
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
          <div style={{ position: 'relative' }}>
            <Handle type="target" position={Position.Left} id={`value_${condition.id}`} style={{ top: '50%' }} />
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
        </>
      ) : (
        <CodeMirror
          className="nodrag"
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
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    </div>
  );
};

export const IfNode: FC<NodeProps<Node<IfNodeData>>> = ({ id, selected }) => {
  const { data, updateNodeData, setEdges } = useFlowStore((state) => ({
    data: state.nodesMap.get(id)?.data as IfNodeData,
    updateNodeData: state.updateNodeData,
    setEdges: state.setEdges,
  }));
  const edges = useEdges();
  const inputSchema = useInputSchema(id, 'main');

  const isInputAnObject = useMemo(() => inputSchema instanceof z.ZodObject, [inputSchema]);
  const availableProperties = useMemo(() => {
    if (!isInputAnObject || !inputSchema) return [];
    return flattenZodSchema(inputSchema);
  }, [inputSchema, isInputAnObject]);

  useEffect(() => {
    if (!data) return;
    const validSourceHandles = new Set([...data.conditions.map((c) => c.id), 'false']);
    const validTargetHandles = new Set(['main', ...data.conditions.map((c) => `value_${c.id}`)]);

    const edgesToRemove = edges.filter(
      (edge) =>
        (edge.source === id && edge.sourceHandle && !validSourceHandles.has(edge.sourceHandle)) ||
        (edge.target === id && edge.targetHandle && !validTargetHandles.has(edge.targetHandle)),
    );

    if (edgesToRemove.length > 0) {
      const edgeIdsToRemove = new Set(edgesToRemove.map((e) => e.id));
      setEdges(edges.filter((e) => !edgeIdsToRemove.has(e.id)));
    }
  }, [data?.conditions, id, setEdges, edges]);

  if (!data) return null;

  const updateCondition = (conditionId: string, updatedPartialCondition: Partial<Condition>) => {
    const newConditions = data.conditions.map((c) => (c.id === conditionId ? { ...c, ...updatedPartialCondition } : c));
    updateNodeData(id, { conditions: newConditions });
  };

  const addCondition = () => {
    const newCondition = {
      id: crypto.randomUUID(),
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
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <Handle type="target" position={Position.Left} id="main" style={{ top: '50%' }} />
        <label style={{ marginLeft: '10px' }}>Input</label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {data.conditions.map((condition) => (
          <ConditionEditor
            key={condition.id}
            nodeId={id}
            condition={condition}
            onUpdate={(updatedPartial) => updateCondition(condition.id, updatedPartial)}
            onRemove={() => removeCondition(condition.id)}
            isOnlyCondition={data.conditions.length === 1}
            isInputAnObject={isInputAnObject}
            availableProperties={availableProperties}
          />
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

        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #555' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Else</span>
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
            />
          </div>
        </div>
      </div>
    </BaseNode>
  );
};

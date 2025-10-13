import { FC, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { ArgumentDefinition, SlashCommandNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STButton, STSelect, STTextarea } from 'sillytavern-utils-lib/components';
import { registrator } from '../autogen-imports.js';
import { schemaToText } from '../../../utils/schema-inspector.js';

export type SlashCommandNodeProps = NodeProps<Node<SlashCommandNodeData>>;

const ArgumentEditor: FC<{
  arg: ArgumentDefinition;
  onUpdate: (data: Partial<ArgumentDefinition>) => void;
  onRemove: () => void;
}> = ({ arg, onUpdate, onRemove }) => {
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
        <STInput
          className="nodrag"
          value={arg.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Argument Name"
          style={{ flex: 1 }}
        />
        <STButton onClick={onRemove}>✕</STButton>
      </div>
      <STInput
        className="nodrag"
        value={arg.description || ''}
        onChange={(e) => onUpdate({ description: e.target.value })}
        placeholder="Description"
      />
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <STSelect className="nodrag" value={arg.type} onChange={(e) => onUpdate({ type: e.target.value as any })}>
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="list">List</option>
        </STSelect>
        <STInput
          label="Is Required"
          type="checkbox"
          checked={arg.isRequired}
          onChange={(e) => onUpdate({ isRequired: e.target.checked })}
        />
      </div>
    </div>
  );
};

export const SlashCommandNode: FC<SlashCommandNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as SlashCommandNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('slashCommandNode');
  const currentNode = useFlowStore((state) => state.nodesMap.get(id));

  const outputHandles = useMemo(() => {
    if (!currentNode || !definition?.getDynamicHandles) return [];
    return definition.getDynamicHandles(currentNode, [], []).outputs;
  }, [currentNode, definition]);

  if (!data) return null;

  const handleArgUpdate = (argId: string, newPartialData: Partial<ArgumentDefinition>) => {
    const newArgs = data.arguments.map((arg) => (arg.id === argId ? { ...arg, ...newPartialData } : arg));
    updateNodeData(id, { arguments: newArgs });
  };

  const handleAddArg = () => {
    const newArg: ArgumentDefinition = {
      id: crypto.randomUUID(),
      name: `arg${data.arguments.length + 1}`,
      type: 'string',
      isRequired: false,
    };
    updateNodeData(id, { arguments: [...data.arguments, newArg] });
  };

  const handleRemoveArg = (argId: string) => {
    const newArgs = data.arguments.filter((arg) => arg.id !== argId);
    updateNodeData(id, { arguments: newArgs });
  };

  return (
    <BaseNode id={id} title="Slash Command" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label>Command Name (prefix `flow-` is added automatically)</label>
          <STInput
            className="nodrag"
            value={data.commandName}
            onChange={(e) => updateNodeData(id, { commandName: e.target.value })}
          />
        </div>
        <div>
          <label>Help Text</label>
          <STTextarea
            className="nodrag"
            value={data.helpText}
            onChange={(e) => updateNodeData(id, { helpText: e.target.value })}
            rows={3}
          />
        </div>
        <hr />
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label>Arguments</label>
            <STButton onClick={handleAddArg}>+ Add Argument</STButton>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.arguments.map((arg) => (
              <ArgumentEditor
                key={arg.id}
                arg={arg}
                onUpdate={(d) => handleArgUpdate(arg.id, d)}
                onRemove={() => handleRemoveArg(arg.id)}
              />
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        {outputHandles.map((handle) => {
          const schemaText = handle.schema ? schemaToText(handle.schema) : handle.type;
          return (
            <div
              key={handle.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}
              title={schemaText}
            >
              <span style={{ textTransform: 'capitalize' }}>{handle.id!.replace(/_/g, ' ')}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={handle.id!}
                style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
              />
            </div>
          );
        })}
      </div>
    </BaseNode>
  );
};

import React, { FC } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { JsonNodeData, JsonNodeItem } from '../../../flow-types.js';
import { BaseNode } from '../BaseNode.js';
import { STInput, STButton, STSelect } from 'sillytavern-utils-lib/components';

export type JsonNodeProps = NodeProps<Node<JsonNodeData>>;

const JsonItemEditor: FC<{
  item: JsonNodeItem;
  path: number[];
  parentType: 'object' | 'array';
  onUpdate: (path: number[], data: Partial<JsonNodeItem> | { value: any }) => void;
  onRemove: (path: number[]) => void;
  onAddChild: (path: number[]) => void;
}> = ({ item, path, parentType, onUpdate, onRemove, onAddChild }) => {
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as JsonNodeItem['type'];
    let newValue: any;
    switch (newType) {
      case 'string':
        newValue = '';
        break;
      case 'number':
        newValue = 0;
        break;
      case 'boolean':
        newValue = false;
        break;
      case 'object':
        newValue = [];
        break;
      case 'array':
        newValue = [];
        break;
    }
    onUpdate(path, { type: newType, value: newValue });
  };

  const renderValueInput = () => {
    switch (item.type) {
      case 'string':
        return (
          <STInput
            className="nodrag"
            value={item.value as string}
            onChange={(e) => onUpdate(path, { value: e.target.value })}
          />
        );
      case 'number':
        return (
          <STInput
            className="nodrag"
            type="number"
            value={item.value as number}
            onChange={(e) => onUpdate(path, { value: Number(e.target.value) })}
          />
        );
      case 'boolean':
        return (
          <STSelect
            className="nodrag"
            value={String(item.value)}
            onChange={(e) => onUpdate(path, { value: e.target.value === 'true' })}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </STSelect>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ marginLeft: path.length > 1 ? '15px' : 0, marginTop: '5px' }}>
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        {parentType === 'object' && (
          <STInput
            className="nodrag"
            value={item.key}
            onChange={(e) => onUpdate(path, { key: e.target.value })}
            placeholder="Key"
          />
        )}
        <STSelect className="nodrag" value={item.type} onChange={handleTypeChange}>
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
          <option value="object">object</option>
          <option value="array">array</option>
        </STSelect>
        <STButton onClick={() => onRemove(path)}>✕</STButton>
      </div>
      <div style={{ marginTop: '5px' }}>{renderValueInput()}</div>

      {(item.type === 'object' || item.type === 'array') && (
        <div style={{ marginLeft: '10px', borderLeft: '1px solid #444', paddingLeft: '5px' }}>
          {(item.value as JsonNodeItem[]).map((child, i) => (
            <JsonItemEditor
              key={child.id}
              item={child}
              path={[...path, i]}
              parentType={item.type as 'object' | 'array'}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAddChild={onAddChild}
            />
          ))}
          <STButton onClick={() => onAddChild(path)} style={{ marginTop: '5px' }}>
            + Add {item.type === 'object' ? 'Property' : 'Item'}
          </STButton>
        </div>
      )}
    </div>
  );
};

export const JsonNode: FC<JsonNodeProps> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as JsonNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  if (!data) return null;

  const updateNested = (items: JsonNodeItem[], path: number[], updater: (item: JsonNodeItem) => JsonNodeItem) => {
    const newItems = structuredClone(items);
    let currentLevel = newItems;
    for (let i = 0; i < path.length - 1; i++) {
      currentLevel = currentLevel[path[i]].value as JsonNodeItem[];
    }
    const finalIndex = path[path.length - 1];
    currentLevel[finalIndex] = updater(currentLevel[finalIndex]);
    return newItems;
  };

  const handleUpdate = (path: number[], newPartialData: object) => {
    const newItems = updateNested(data.items, path, (item) => ({ ...item, ...newPartialData }));
    updateNodeData(id, { items: newItems });
  };

  const handleRemove = (path: number[]) => {
    const newItems = structuredClone(data.items);
    let parentLevel = newItems;
    if (path.length > 1) {
      let currentLevel: any = newItems;
      for (let i = 0; i < path.length - 2; i++) {
        currentLevel = currentLevel[path[i]].value;
      }
      parentLevel = currentLevel[path[path.length - 2]].value;
    }
    parentLevel.splice(path[path.length - 1], 1);
    updateNodeData(id, { items: newItems });
  };

  const handleAddChild = (path: number[]) => {
    const newItem: JsonNodeItem = { id: crypto.randomUUID(), key: 'newKey', value: '', type: 'string' };
    const newItems = updateNested(data.items, path, (item) => ({
      ...item,
      value: [...(item.value as any[]), newItem],
    }));
    updateNodeData(id, { items: newItems });
  };

  const addRootItem = () => {
    const newItem = { id: crypto.randomUUID(), key: 'newKey', value: '', type: 'string' as const };
    updateNodeData(id, { items: [...data.items, newItem] });
  };

  const handleRootTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateNodeData(id, { rootType: e.target.value as 'object' | 'array', items: [] });
  };

  return (
    <BaseNode id={id} title="JSON" selected={selected}>
      <div style={{ marginBottom: '10px' }}>
        <label>Root Type: </label>
        <STSelect className="nodrag" value={data.rootType} onChange={handleRootTypeChange}>
          <option value="object">Object</option>
          <option value="array">Array</option>
        </STSelect>
      </div>
      {(data.items || []).map((item, index) => (
        <JsonItemEditor
          key={item.id}
          item={item}
          path={[index]}
          parentType={data.rootType ?? 'object'}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          onAddChild={handleAddChild}
        />
      ))}
      <STButton className="nodrag" onClick={addRootItem} style={{ marginTop: '10px' }}>
        Add {data.rootType === 'object' ? 'Property' : 'Item'}
      </STButton>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
};

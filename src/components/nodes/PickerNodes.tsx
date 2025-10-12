import { FC, useEffect, useMemo, useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../popup/flowStore.js';
import { BaseNode } from './BaseNode.js';
import { STFancyDropdown, STSelect } from 'sillytavern-utils-lib/components';
import { settingsManager } from '../../config.js';
import { shallow } from 'zustand/shallow';
import {
  PickCharacterNodeData,
  PickLorebookNodeData,
  PickMathOperationNodeData,
  PickPromptEngineeringModeNodeData,
  PickPromptNodeData,
  PickRandomModeNodeData,
  PickRegexModeNodeData,
  PickStringToolsOperationNodeData,
  PickTypeConverterTargetNodeData,
  PickVariableScopeNodeData,
} from '../../flow-types.js';
import { PromptEngineeringMode } from '../../config.js';
import { world_names } from 'sillytavern-utils-lib/config';

// A generic picker for simple, static enum-like values
const EnumPicker: FC<{
  id: string;
  selected: boolean;
  title: string;
  value: string;
  options: readonly { value: string; label: string }[];
  outputHandleId: string;
  onUpdate: (value: string) => void;
}> = ({ id, selected, title, value, options, outputHandleId, onUpdate }) => {
  return (
    <BaseNode id={id} title={title} selected={selected}>
      <STSelect className="nodrag" value={value} onChange={(e) => onUpdate(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </STSelect>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}>
        <span>Value</span>
        <Handle
          type="source"
          position={Position.Right}
          id={outputHandleId}
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    </BaseNode>
  );
};

export const PickCharacterNode: FC<NodeProps<Node<PickCharacterNodeData>>> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as PickCharacterNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const { characters } = SillyTavern.getContext();
  if (!data) return null;
  return (
    <BaseNode id={id} title="Pick Character" selected={selected}>
      <STFancyDropdown
        value={[data.characterAvatar ?? '']}
        onChange={(e) => updateNodeData(id, { characterAvatar: e[0] })}
        multiple={false}
        items={characters.map((c: any) => ({ value: c.avatar, label: c.name }))}
        inputClasses="nodrag"
        containerClasses="nodrag"
        closeOnSelect={true}
        enableSearch={true}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}>
        <span>Avatar</span>
        <Handle
          type="source"
          position={Position.Right}
          id="avatar"
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    </BaseNode>
  );
};

export const PickLorebookNode: FC<NodeProps<Node<PickLorebookNodeData>>> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as PickLorebookNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const [lorebookNames, setLorebookNames] = useState<string[]>([]);
  useEffect(() => {
    setLorebookNames(world_names);
  }, []);
  const lorebookOptions = useMemo(() => lorebookNames.map((name) => ({ value: name, label: name })), [lorebookNames]);
  if (!data) return null;
  return (
    <BaseNode id={id} title="Pick Lorebook" selected={selected}>
      <STFancyDropdown
        value={[data.worldName ?? '']}
        onChange={(e) => updateNodeData(id, { worldName: e[0] })}
        multiple={false}
        items={lorebookOptions}
        inputClasses="nodrag"
        containerClasses="nodrag"
        closeOnSelect={true}
        enableSearch={true}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}>
        <span>Name</span>
        <Handle
          type="source"
          position={Position.Right}
          id="name"
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    </BaseNode>
  );
};

export const PickPromptNode: FC<NodeProps<Node<PickPromptNodeData>>> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as PickPromptNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  const promptOptions = useMemo(() => {
    const prompts = settingsManager.getSettings().prompts;
    return Object.keys(prompts).map((name) => ({ value: name, label: name }));
  }, []);
  if (!data) return null;
  return (
    <BaseNode id={id} title="Pick Prompt" selected={selected}>
      <STFancyDropdown
        value={[data.promptName ?? '']}
        onChange={(e) => updateNodeData(id, { promptName: e[0] })}
        multiple={false}
        items={promptOptions}
        inputClasses="nodrag"
        containerClasses="nodrag"
        closeOnSelect={true}
        enableSearch={true}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}>
        <span>Name</span>
        <Handle
          type="source"
          position={Position.Right}
          id="name"
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    </BaseNode>
  );
};

export const PickMathOperationNode: FC<NodeProps<Node<PickMathOperationNodeData>>> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as PickMathOperationNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  if (!data) return null;
  return (
    <EnumPicker
      id={id}
      selected={selected}
      title="Pick Math Operation"
      value={data.operation}
      options={[
        { value: 'add', label: 'Add' },
        { value: 'subtract', label: 'Subtract' },
        { value: 'multiply', label: 'Multiply' },
        { value: 'divide', label: 'Divide' },
        { value: 'modulo', label: 'Modulo' },
      ]}
      outputHandleId="operation"
      onUpdate={(value) => updateNodeData(id, { operation: value as any })}
    />
  );
};

export const PickStringToolsOperationNode: FC<NodeProps<Node<PickStringToolsOperationNodeData>>> = ({
  id,
  selected,
}) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as PickStringToolsOperationNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  if (!data) return null;
  return (
    <EnumPicker
      id={id}
      selected={selected}
      title="Pick String Operation"
      value={data.operation}
      options={[
        { value: 'merge', label: 'Merge' },
        { value: 'split', label: 'Split' },
        { value: 'join', label: 'Join' },
      ]}
      outputHandleId="operation"
      onUpdate={(value) => updateNodeData(id, { operation: value as any })}
    />
  );
};

export const PickVariableScopeNode: FC<NodeProps<Node<PickVariableScopeNodeData>>> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as PickVariableScopeNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  if (!data) return null;
  return (
    <EnumPicker
      id={id}
      selected={selected}
      title="Pick Variable Scope"
      value={data.scope}
      options={[
        { value: 'Execution', label: 'Flow Execution' },
        { value: 'Session', label: 'SillyTavern Session' },
      ]}
      outputHandleId="scope"
      onUpdate={(value) => updateNodeData(id, { scope: value as any })}
    />
  );
};

export const PickPromptEngineeringModeNode: FC<NodeProps<Node<PickPromptEngineeringModeNodeData>>> = ({
  id,
  selected,
}) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as PickPromptEngineeringModeNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  if (!data) return null;
  return (
    <EnumPicker
      id={id}
      selected={selected}
      title="Pick Prompt Mode"
      value={data.mode}
      options={Object.values(PromptEngineeringMode).map((mode) => ({ value: mode, label: mode }))}
      outputHandleId="mode"
      onUpdate={(value) => updateNodeData(id, { mode: value as any })}
    />
  );
};

export const PickRandomModeNode: FC<NodeProps<Node<PickRandomModeNodeData>>> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as PickRandomModeNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  if (!data) return null;
  return (
    <EnumPicker
      id={id}
      selected={selected}
      title="Pick Random Mode"
      value={data.mode}
      options={[
        { value: 'number', label: 'Number' },
        { value: 'array', label: 'From Array' },
      ]}
      outputHandleId="mode"
      onUpdate={(value) => updateNodeData(id, { mode: value as any })}
    />
  );
};

export const PickRegexModeNode: FC<NodeProps<Node<PickRegexModeNodeData>>> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as PickRegexModeNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  if (!data) return null;
  return (
    <EnumPicker
      id={id}
      selected={selected}
      title="Pick Regex Mode"
      value={data.mode}
      options={[
        { value: 'sillytavern', label: 'SillyTavern' },
        { value: 'custom', label: 'Custom' },
      ]}
      outputHandleId="mode"
      onUpdate={(value) => updateNodeData(id, { mode: value as any })}
    />
  );
};

export const PickTypeConverterTargetNode: FC<NodeProps<Node<PickTypeConverterTargetNodeData>>> = ({ id, selected }) => {
  const { data, updateNodeData } = useFlowStore(
    (state) => ({
      data: state.nodes.find((n) => n.id === id)?.data as PickTypeConverterTargetNodeData,
      updateNodeData: state.updateNodeData,
    }),
    shallow,
  );
  if (!data) return null;
  return (
    <EnumPicker
      id={id}
      selected={selected}
      title="Pick Conversion Type"
      value={data.targetType}
      options={[
        { value: 'string', label: 'String' },
        { value: 'number', label: 'Number' },
        { value: 'object', label: 'Object (from JSON)' },
        { value: 'array', label: 'Array (from JSON)' },
      ]}
      outputHandleId="type"
      onUpdate={(value) => updateNodeData(id, { targetType: value as any })}
    />
  );
};

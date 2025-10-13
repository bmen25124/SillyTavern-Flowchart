import { FC, useEffect, useMemo, useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { STFancyDropdown, STSelect } from 'sillytavern-utils-lib/components';
import { settingsManager } from '../../../config.js';
import {
  PickCharacterNodeData,
  PickLorebookNodeData,
  PickMathOperationNodeData,
  PickPromptEngineeringModeNodeData,
  PickPromptNodeData,
  PickRandomModeNodeData,
  PickRegexModeNodeData,
  PickRegexScriptNodeData,
  PickStringToolsOperationNodeData,
  PickTypeConverterTargetNodeData,
} from './definition.js';
import { PromptEngineeringMode } from '../../../config.js';
import { world_names } from 'sillytavern-utils-lib/config';
import { RegexScriptData } from 'sillytavern-utils-lib/types/regex';
import { schemaToText } from '../../../utils/schema-inspector.js';
import { HandleSpec } from '../definitions/types.js';
import { registrator } from '../autogen-imports.js';

// A generic picker for simple, static enum-like values
const EnumPicker: FC<{
  id: string;
  selected: boolean;
  title: string;
  value: string;
  options: readonly { value: string; label: string }[];
  outputHandle: HandleSpec;
  onUpdate: (value: string) => void;
}> = ({ id, selected, title, value, options, outputHandle, onUpdate }) => {
  const schemaText = outputHandle.schema ? schemaToText(outputHandle.schema) : outputHandle.type;
  return (
    <BaseNode id={id} title={title} selected={selected}>
      <STSelect className="nodrag" value={value} onChange={(e) => onUpdate(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </STSelect>
      <div
        style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}
        title={schemaText}
      >
        <span>Value</span>
        <Handle
          type="source"
          position={Position.Right}
          id={outputHandle.id}
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    </BaseNode>
  );
};

export const PickCharacterNode: FC<NodeProps<Node<PickCharacterNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickCharacterNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const { characters } = SillyTavern.getContext();
  const definition = registrator.nodeDefinitionMap.get('pickCharacterNode');
  const outputHandle = definition?.handles.outputs[0];
  const schemaText = outputHandle?.schema ? schemaToText(outputHandle.schema) : outputHandle?.type;

  if (!data || !outputHandle) return null;

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
      <div
        style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}
        title={schemaText}
      >
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
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickLorebookNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const [lorebookNames, setLorebookNames] = useState<string[]>([]);
  useEffect(() => {
    setLorebookNames(world_names);
  }, []);
  const lorebookOptions = useMemo(() => lorebookNames.map((name) => ({ value: name, label: name })), [lorebookNames]);
  const definition = registrator.nodeDefinitionMap.get('pickLorebookNode');
  const outputHandle = definition?.handles.outputs[0];
  const schemaText = outputHandle?.schema ? schemaToText(outputHandle.schema) : outputHandle?.type;

  if (!data || !outputHandle) return null;

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
      <div
        style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}
        title={schemaText}
      >
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
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickPromptNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const promptOptions = useMemo(() => {
    const prompts = settingsManager.getSettings().prompts;
    return Object.keys(prompts).map((name) => ({ value: name, label: name }));
  }, []);
  const definition = registrator.nodeDefinitionMap.get('pickPromptNode');
  const outputHandle = definition?.handles.outputs[0];
  const schemaText = outputHandle?.schema ? schemaToText(outputHandle.schema) : outputHandle?.type;

  if (!data || !outputHandle) return null;
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
      <div
        style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}
        title={schemaText}
      >
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

export const PickRegexScriptNode: FC<NodeProps<Node<PickRegexScriptNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickRegexScriptNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const [allRegexes, setAllRegexes] = useState<RegexScriptData[]>([]);
  useEffect(() => {
    setAllRegexes(SillyTavern.getContext().extensionSettings.regex ?? []);
  }, []);
  const regexOptions = useMemo(() => allRegexes.map((r) => ({ value: r.id, label: r.scriptName })), [allRegexes]);
  const definition = registrator.nodeDefinitionMap.get('pickRegexScriptNode');
  const outputHandle = definition?.handles.outputs[0];
  const schemaText = outputHandle?.schema ? schemaToText(outputHandle.schema) : outputHandle?.type;

  if (!data || !outputHandle) return null;

  return (
    <BaseNode id={id} title="Pick Regex Script" selected={selected}>
      <STFancyDropdown
        value={[data.scriptId ?? '']}
        onChange={(e) => updateNodeData(id, { scriptId: e[0] })}
        multiple={false}
        items={regexOptions}
        inputClasses="nodrag"
        containerClasses="nodrag"
        closeOnSelect={true}
        enableSearch={true}
      />
      <div
        style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}
        title={schemaText}
      >
        <span>ID</span>
        <Handle
          type="source"
          position={Position.Right}
          id="id"
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    </BaseNode>
  );
};

export const PickMathOperationNode: FC<NodeProps<Node<PickMathOperationNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickMathOperationNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('pickMathOperationNode');
  const outputHandle = definition?.handles.outputs[0];

  if (!data || !outputHandle) return null;
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
      outputHandle={outputHandle}
      onUpdate={(value) => updateNodeData(id, { operation: value as any })}
    />
  );
};

export const PickStringToolsOperationNode: FC<NodeProps<Node<PickStringToolsOperationNodeData>>> = ({
  id,
  selected,
}) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickStringToolsOperationNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('pickStringToolsOperationNode');
  const outputHandle = definition?.handles.outputs[0];

  if (!data || !outputHandle) return null;
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
      outputHandle={outputHandle}
      onUpdate={(value) => updateNodeData(id, { operation: value as any })}
    />
  );
};

export const PickPromptEngineeringModeNode: FC<NodeProps<Node<PickPromptEngineeringModeNodeData>>> = ({
  id,
  selected,
}) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickPromptEngineeringModeNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('pickPromptEngineeringModeNode');
  const outputHandle = definition?.handles.outputs[0];

  if (!data || !outputHandle) return null;
  return (
    <EnumPicker
      id={id}
      selected={selected}
      title="Pick Prompt Mode"
      value={data.mode}
      options={Object.values(PromptEngineeringMode).map((mode) => ({ value: mode, label: mode }))}
      outputHandle={outputHandle}
      onUpdate={(value) => updateNodeData(id, { mode: value as any })}
    />
  );
};

export const PickRandomModeNode: FC<NodeProps<Node<PickRandomModeNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickRandomModeNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('pickRandomModeNode');
  const outputHandle = definition?.handles.outputs[0];

  if (!data || !outputHandle) return null;
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
      outputHandle={outputHandle}
      onUpdate={(value) => updateNodeData(id, { mode: value as any })}
    />
  );
};

export const PickRegexModeNode: FC<NodeProps<Node<PickRegexModeNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickRegexModeNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('pickRegexModeNode');
  const outputHandle = definition?.handles.outputs[0];

  if (!data || !outputHandle) return null;
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
      outputHandle={outputHandle}
      onUpdate={(value) => updateNodeData(id, { mode: value as any })}
    />
  );
};

export const PickTypeConverterTargetNode: FC<NodeProps<Node<PickTypeConverterTargetNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickTypeConverterTargetNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('pickTypeConverterTargetNode');
  const outputHandle = definition?.handles.outputs[0];

  if (!data || !outputHandle) return null;
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
      outputHandle={outputHandle}
      onUpdate={(value) => updateNodeData(id, { targetType: value as any })}
    />
  );
};

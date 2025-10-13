import { FC, useEffect, useMemo, useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { STFancyDropdown, STSelect } from 'sillytavern-utils-lib/components';
import { settingsManager } from '../../../config.js';
import {
  PickCharacterNodeData,
  PickFlowNodeData,
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

// Generic picker for simple, static enum-like values
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
          id={outputHandle.id!}
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    </BaseNode>
  );
};

// Generic picker for complex, dynamic dropdowns
const FancyDropdownPicker: FC<{
  id: string;
  selected: boolean;
  title: string;
  data: any;
  items: { value: string; label: string }[];
  dataKey: string;
  outputHandle: HandleSpec;
}> = ({ id, selected, title, data, items, dataKey, outputHandle }) => {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const schemaText = outputHandle.schema ? schemaToText(outputHandle.schema) : outputHandle.type;

  return (
    <BaseNode id={id} title={title} selected={selected}>
      <STFancyDropdown
        value={[data[dataKey] ?? '']}
        onChange={(e) => updateNodeData(id, { [dataKey]: e[0] })}
        multiple={false}
        items={items}
        inputClasses="nodrag"
        containerClasses="nodrag"
        closeOnSelect={true}
        enableSearch={true}
      />
      <div
        style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}
        title={schemaText}
      >
        <span style={{ textTransform: 'capitalize' }}>{outputHandle.id}</span>
        <Handle
          type="source"
          position={Position.Right}
          id={outputHandle.id!}
          style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
        />
      </div>
    </BaseNode>
  );
};

export const PickCharacterNode: FC<NodeProps<Node<PickCharacterNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickCharacterNodeData;
  const { characters } = SillyTavern.getContext();
  const definition = registrator.nodeDefinitionMap.get('pickCharacterNode');
  if (!data || !definition) return null;

  return (
    <FancyDropdownPicker
      id={id}
      selected={selected}
      title="Pick Character"
      data={data}
      items={characters.map((c: any) => ({ value: c.avatar, label: c.name }))}
      dataKey="characterAvatar"
      outputHandle={definition.handles.outputs[0]}
    />
  );
};

export const PickLorebookNode: FC<NodeProps<Node<PickLorebookNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickLorebookNodeData;
  const definition = registrator.nodeDefinitionMap.get('pickLorebookNode');
  const [lorebookNames, setLorebookNames] = useState<string[]>([]);
  useEffect(() => setLorebookNames(world_names), []);
  if (!data || !definition) return null;

  return (
    <FancyDropdownPicker
      id={id}
      selected={selected}
      title="Pick Lorebook"
      data={data}
      items={lorebookNames.map((name) => ({ value: name, label: name }))}
      dataKey="worldName"
      outputHandle={definition.handles.outputs[0]}
    />
  );
};

export const PickPromptNode: FC<NodeProps<Node<PickPromptNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickPromptNodeData;
  const definition = registrator.nodeDefinitionMap.get('pickPromptNode');
  const promptOptions = useMemo(() => {
    const prompts = settingsManager.getSettings().prompts;
    return Object.keys(prompts).map((name) => ({ value: name, label: name }));
  }, []);
  if (!data || !definition) return null;

  return (
    <FancyDropdownPicker
      id={id}
      selected={selected}
      title="Pick Prompt"
      data={data}
      items={promptOptions}
      dataKey="promptName"
      outputHandle={definition.handles.outputs[0]}
    />
  );
};

export const PickRegexScriptNode: FC<NodeProps<Node<PickRegexScriptNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickRegexScriptNodeData;
  const definition = registrator.nodeDefinitionMap.get('pickRegexScriptNode');
  const [allRegexes, setAllRegexes] = useState<RegexScriptData[]>([]);
  useEffect(() => setAllRegexes(SillyTavern.getContext().extensionSettings.regex ?? []), []);
  if (!data || !definition) return null;

  return (
    <FancyDropdownPicker
      id={id}
      selected={selected}
      title="Pick Regex Script"
      data={data}
      items={allRegexes.map((r) => ({ value: r.id, label: r.scriptName }))}
      dataKey="scriptId"
      outputHandle={definition.handles.outputs[0]}
    />
  );
};

export const PickFlowNode: FC<NodeProps<Node<PickFlowNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickFlowNodeData;
  const definition = registrator.nodeDefinitionMap.get('pickFlowNode');
  const flowOptions = useMemo(() => {
    const flows = settingsManager.getSettings().flows;
    return Object.entries(flows).map(([id, { name }]) => ({ value: id, label: name }));
  }, []);
  if (!data || !definition) return null;

  return (
    <FancyDropdownPicker
      id={id}
      selected={selected}
      title="Pick Flow"
      data={data}
      items={flowOptions}
      dataKey="flowId"
      outputHandle={definition.handles.outputs[0]}
    />
  );
};

// Enum-based Pickers
export const PickMathOperationNode: FC<NodeProps<Node<PickMathOperationNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickMathOperationNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('pickMathOperationNode');
  if (!data || !definition) return null;

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
      outputHandle={definition.handles.outputs[0]}
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
  if (!data || !definition) return null;

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
      outputHandle={definition.handles.outputs[0]}
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
  if (!data || !definition) return null;

  return (
    <EnumPicker
      id={id}
      selected={selected}
      title="Pick Prompt Mode"
      value={data.mode}
      options={Object.values(PromptEngineeringMode).map((mode) => ({ value: mode, label: mode }))}
      outputHandle={definition.handles.outputs[0]}
      onUpdate={(value) => updateNodeData(id, { mode: value as any })}
    />
  );
};

export const PickRandomModeNode: FC<NodeProps<Node<PickRandomModeNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickRandomModeNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('pickRandomModeNode');
  if (!data || !definition) return null;

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
      outputHandle={definition.handles.outputs[0]}
      onUpdate={(value) => updateNodeData(id, { mode: value as any })}
    />
  );
};

export const PickRegexModeNode: FC<NodeProps<Node<PickRegexModeNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickRegexModeNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('pickRegexModeNode');
  if (!data || !definition) return null;

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
      outputHandle={definition.handles.outputs[0]}
      onUpdate={(value) => updateNodeData(id, { mode: value as any })}
    />
  );
};

export const PickTypeConverterTargetNode: FC<NodeProps<Node<PickTypeConverterTargetNodeData>>> = ({ id, selected }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickTypeConverterTargetNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const definition = registrator.nodeDefinitionMap.get('pickTypeConverterTargetNode');
  if (!data || !definition) return null;

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
      outputHandle={definition.handles.outputs[0]}
      onUpdate={(value) => updateNodeData(id, { targetType: value as any })}
    />
  );
};

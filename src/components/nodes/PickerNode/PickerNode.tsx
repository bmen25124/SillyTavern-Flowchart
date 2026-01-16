import { FC, useEffect, useMemo, useState } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { BaseNode } from '../BaseNode.js';
import { STFancyDropdown, STSelect } from 'sillytavern-utils-lib/components/react';
import { settingsManager } from '../../../config.js';
import { PickerNodeData, PickerType, pickerNodeDefinition } from './definition.js';
import { PromptEngineeringMode } from '../../../config.js';
import { world_names } from 'sillytavern-utils-lib/config';
import { RegexScriptData } from 'sillytavern-utils-lib/types/regex';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';

export type PickerNodeProps = NodeProps<Node<PickerNodeData>>;

const pickerTypeOptions: { value: PickerType; label: string }[] = [
  { value: 'character', label: 'Character' },
  { value: 'lorebook', label: 'Lorebook' },
  { value: 'flow', label: 'Flow' },
  { value: 'prompt', label: 'Prompt Template' },
  { value: 'regexScript', label: 'Regex Script' },
  { value: 'mathOperation', label: 'Math Operation' },
  { value: 'stringOperation', label: 'String Operation' },
  { value: 'promptMode', label: 'Prompt Mode' },
  { value: 'randomMode', label: 'Random Mode' },
  { value: 'regexMode', label: 'Regex Mode' },
  { value: 'converterTarget', label: 'Conversion Type' },
];

const staticOptions: Partial<Record<PickerType, { value: string; label: string }[]>> = {
  mathOperation: [
    { value: 'add', label: 'Add' },
    { value: 'subtract', label: 'Subtract' },
    { value: 'multiply', label: 'Multiply' },
    { value: 'divide', label: 'Divide' },
    { value: 'modulo', label: 'Modulo' },
  ],
  stringOperation: [
    'merge',
    'split',
    'join',
    'toUpperCase',
    'toLowerCase',
    'trim',
    'replace',
    'replaceAll',
    'slice',
    'length',
    'startsWith',
    'endsWith',
  ].map((op) => ({ value: op, label: op })),
  promptMode: Object.values(PromptEngineeringMode).map((mode) => ({ value: mode, label: mode })),
  randomMode: [
    { value: 'number', label: 'Number' },
    { value: 'array', label: 'From Array' },
  ],
  regexMode: [
    { value: 'sillytavern', label: 'SillyTavern' },
    { value: 'custom', label: 'Custom' },
  ],
  converterTarget: [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'object', label: 'Object (from JSON)' },
    { value: 'array', label: 'Array (from JSON)' },
  ],
};

export const PickerNode: FC<PickerNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as PickerNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const { characters } = SillyTavern.getContext();
  const [regexes, setRegexes] = useState<RegexScriptData[]>([]);

  useEffect(() => {
    setRegexes(SillyTavern.getContext().extensionSettings.regex ?? []);
  }, []);

  const dynamicOptions = useMemo(() => {
    const settings = settingsManager.getSettings();
    return {
      character: characters.map((c: { avatar: string; name: string }) => ({ value: c.avatar, label: c.name })),
      lorebook: world_names.map((name: string) => ({ value: name, label: name })),
      prompt: Object.keys(settings.prompts).map((name) => ({ value: name, label: name })),
      flow: Object.values(settings.flows).map((flow) => ({ value: flow.id, label: flow.name })),
      regexScript: regexes.map((r) => ({ value: r.id, label: r.scriptName })),
    };
  }, [characters, regexes]);

  if (!data) return null;

  const { pickerType, value } = data;

  const handleTypeChange = (newType: PickerType) => {
    updateNodeData(id, { pickerType: newType, value: '' });
  };

  const handleValueChange = (newValue: string) => {
    updateNodeData(id, { value: newValue });
  };

  const renderValueSelector = () => {
    if (staticOptions[pickerType]) {
      return (
        <STSelect className="nodrag" value={value} onChange={(e) => handleValueChange(e.target.value)}>
          <option value="" disabled>
            -- Select an option --
          </option>
          {staticOptions[pickerType]!.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </STSelect>
      );
    }
    const options = (dynamicOptions as any)[pickerType] ?? [];
    return (
      <STFancyDropdown
        value={[value ?? '']}
        onChange={(e) => handleValueChange(e[0])}
        multiple={false}
        items={options}
        inputClasses="nodrag"
        containerClasses="nodrag nowheel"
        closeOnSelect={true}
        enableSearch={true}
      />
    );
  };

  return (
    <BaseNode id={id} title="Picker" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <STSelect
          className="nodrag"
          value={pickerType}
          onChange={(e) => handleTypeChange(e.target.value as PickerType)}
        >
          {pickerTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </STSelect>
        {renderValueSelector()}
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={pickerNodeDefinition} type="output" />
      </div>
    </BaseNode>
  );
};

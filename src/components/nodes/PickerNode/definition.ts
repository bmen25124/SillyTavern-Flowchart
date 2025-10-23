import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, HandleSpec, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { this_chid } from 'sillytavern-utils-lib/config';
import { createRequiredFieldValidator, combineValidators } from '../../../utils/validation-helpers.js';
import { PickerNode } from './PickerNode.js';

export const PickerTypeSchema = z.enum([
  'character',
  'lorebook',
  'prompt',
  'regexScript',
  'mathOperation',
  'stringOperation',
  'promptMode',
  'randomMode',
  'regexMode',
  'converterTarget',
  'flow',
]);
export type PickerType = z.infer<typeof PickerTypeSchema>;

export const PickerNodeDataSchema = z.object({
  pickerType: PickerTypeSchema.default('character'),
  value: z.string().default(''),
  _version: z.number().optional(),
});
export type PickerNodeData = z.infer<typeof PickerNodeDataSchema>;

const execute: NodeExecutor = async (node, _input, { dependencies }) => {
  const data = PickerNodeDataSchema.parse(node.data);
  const { pickerType, value } = data;

  switch (pickerType) {
    case 'character': {
      const { characters } = dependencies.getSillyTavernContext();
      const activeAvatar = this_chid !== undefined && characters[this_chid] ? characters[this_chid].avatar : undefined;
      return { value, activeAvatar };
    }
    case 'mathOperation':
    case 'stringOperation':
    case 'promptMode':
    case 'randomMode':
    case 'regexMode':
    case 'converterTarget':
    case 'lorebook':
    case 'prompt':
    case 'regexScript':
    case 'flow':
      return { value };
    default:
      return { value };
  }
};

const pickerConfigs: Record<
  PickerType,
  { label: string; outputHandle: Omit<HandleSpec, 'type'> & { type?: FlowDataType } }
> = {
  character: {
    label: 'Pick Character',
    outputHandle: { id: 'value', label: 'Avatar', type: FlowDataType.CHARACTER_AVATAR },
  },
  lorebook: {
    label: 'Pick Lorebook',
    outputHandle: { id: 'value', label: 'Name', type: FlowDataType.LOREBOOK_NAME },
  },
  prompt: { label: 'Pick Prompt', outputHandle: { id: 'value', label: 'Name' } },
  regexScript: {
    label: 'Pick Regex Script',
    outputHandle: { id: 'value', label: 'ID', type: FlowDataType.REGEX_SCRIPT_ID },
  },
  mathOperation: { label: 'Pick Math Operation', outputHandle: { id: 'value', label: 'Operation' } },
  stringOperation: { label: 'Pick String Operation', outputHandle: { id: 'value', label: 'Operation' } },
  promptMode: { label: 'Pick Prompt Mode', outputHandle: { id: 'value', label: 'Mode' } },
  randomMode: { label: 'Pick Random Mode', outputHandle: { id: 'value', label: 'Mode' } },
  regexMode: { label: 'Pick Regex Mode', outputHandle: { id: 'value', label: 'Mode' } },
  converterTarget: { label: 'Pick Conversion Type', outputHandle: { id: 'value', label: 'Type' } },
  flow: {
    label: 'Pick Flow',
    outputHandle: { id: 'value', label: 'Flow ID', type: FlowDataType.FLOW_ID },
  },
};

const validateValue = createRequiredFieldValidator('value', 'A selection is required.');

const DEFAULT_PICKER_TYPE: PickerType = 'character';

export const pickerNodeDefinition: NodeDefinition<PickerNodeData> = {
  type: 'pickerNode',
  label: 'Picker',
  category: 'Picker',
  component: PickerNode,
  dataSchema: PickerNodeDataSchema,
  currentVersion: 1,
  initialData: { pickerType: DEFAULT_PICKER_TYPE, value: '' },
  handles: {
    inputs: [{ id: 'main', type: FlowDataType.ANY }],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  validate: (node: Node<PickerNodeData>, edges: Edge[]): ValidationIssue[] => {
    if (node.data.pickerType === 'character' && edges.some((edge) => edge.sourceHandle === 'activeAvatar')) {
      return [];
    }
    return combineValidators(validateValue)(node, edges);
  },
  execute,
  getDynamicHandles: (node: Node<PickerNodeData>) => {
    const { pickerType } = node.data;
    const config = pickerConfigs[pickerType];
    const outputs: HandleSpec[] = [];

    outputs.push({
      id: config.outputHandle.id,
      label: config.outputHandle.label,
      type: config.outputHandle.type ?? FlowDataType.STRING,
      schema: config.outputHandle.schema,
    });

    if (pickerType === 'character') {
      outputs.push({ id: 'activeAvatar', type: FlowDataType.CHARACTER_AVATAR, label: 'Active Avatar' });
    }

    return { inputs: [], outputs };
  },
  getSuggestionBlueprints: ({ direction }) => {
    if (direction !== 'outputs') return [];
    return Object.entries(pickerConfigs)
      .filter(([pickerType]) => pickerType !== DEFAULT_PICKER_TYPE)
      .map(([pickerType, config]) => {
        const typedPickerType = pickerType as PickerType;
        const suffix = config.label.replace(/^Pick\s+/i, '');
        return {
          id: `picker-${pickerType}`,
          labelSuffix: `(${suffix})`,
          dataOverrides: { pickerType: typedPickerType, value: '' },
        };
      });
  },
};

registrator.register(pickerNodeDefinition);

import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { AsyncDataDrivenNode } from '../AsyncDataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STFancyDropdown, STSelect, STTextarea } from 'sillytavern-utils-lib/components';
import { RegexScriptData } from 'sillytavern-utils-lib/types/regex';

export const RegexNodeDataSchema = z.object({
  mode: z.enum(['sillytavern', 'custom']).default('sillytavern'),
  scriptId: z.string().default(''),
  findRegex: z.string().default(''),
  replaceString: z.string().default(''),
  _version: z.number().optional(),
});
export type RegexNodeData = z.infer<typeof RegexNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = RegexNodeDataSchema.parse(node.data);
  const mode = resolveInput(input, data, 'mode') ?? 'sillytavern';
  const scriptId = resolveInput(input, data, 'scriptId');
  const findRegex = resolveInput(input, data, 'findRegex');
  const replaceString = resolveInput(input, data, 'replaceString');
  const inputString = input.string ?? '';
  if (typeof inputString !== 'string') throw new Error('Input must be a string.');

  let result = inputString;
  let matches: string[] | null = null;
  let finalFindRegex: string | undefined;

  if (mode === 'sillytavern') {
    if (!scriptId) throw new Error('SillyTavern Regex ID is not provided.');
    const { extensionSettings } = dependencies.getSillyTavernContext();
    const script = (extensionSettings.regex ?? []).find((r: any) => r.id === scriptId);
    if (!script) throw new Error(`Regex with ID "${scriptId}" not found.`);
    result = dependencies.st_runRegexScript(script, inputString);
    finalFindRegex = script.findRegex;
  } else {
    if (findRegex === undefined) throw new Error('Find Regex is required for custom mode.');
    try {
      const regex = new RegExp(findRegex, 'g');
      result = inputString.replace(regex, replaceString ?? '');
      finalFindRegex = findRegex;
    } catch (e: unknown) {
      const error = e as Error;
      throw new Error(`Invalid custom regex: ${error.message}`);
    }
  }

  if (finalFindRegex) {
    try {
      matches = inputString.match(new RegExp(finalFindRegex, 'g'));
    } catch (e: unknown) {
      // Ignore
    }
  }

  return { result, matches: matches ?? [] };
};

export const regexNodeDefinition: NodeDefinition<RegexNodeData> = {
  type: 'regexNode',
  label: 'Regex',
  category: 'Data Processing',
  component: AsyncDataDrivenNode,
  dataSchema: RegexNodeDataSchema,
  currentVersion: 1,
  initialData: { mode: 'sillytavern', findRegex: '', replaceString: '', scriptId: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'string', type: FlowDataType.STRING },
      { id: 'mode', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.STRING },
      { id: 'matches', type: FlowDataType.ARRAY, schema: z.array(z.string()) },
    ],
  },
  getDynamicHandles: (node) => {
    const data = node.data;
    const mode = data?.mode ?? 'sillytavern';
    const inputs = [];

    if (mode === 'sillytavern') {
      inputs.push({ id: 'scriptId', type: FlowDataType.REGEX_SCRIPT_ID });
    } else {
      inputs.push({ id: 'findRegex', type: FlowDataType.STRING });
      inputs.push({ id: 'replaceString', type: FlowDataType.STRING });
    }

    return {
      inputs,
      outputs: [],
    };
  },
  validate: (node: Node<RegexNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const data = node.data;
    const mode = data.mode;

    if (mode === 'sillytavern') {
      const isConnected = edges.some((edge) => edge.target === node.id && edge.targetHandle === 'scriptId');
      if (!data.scriptId && !isConnected) {
        issues.push({
          fieldId: 'scriptId',
          message: 'Regex Script is required in SillyTavern mode.',
          severity: 'error',
        });
      }
    } else if (mode === 'custom') {
      const isFindRegexConnected = edges.some((edge) => edge.target === node.id && edge.targetHandle === 'findRegex');
      if (!data.findRegex && !isFindRegexConnected) {
        issues.push({ fieldId: 'findRegex', message: 'Find Regex is required in custom mode.', severity: 'error' });
      }
      // Only validate the static regex if it's not connected
      if (data.findRegex && !isFindRegexConnected) {
        try {
          new RegExp(data.findRegex);
        } catch (e: unknown) {
          const error = e as Error;
          issues.push({ fieldId: 'findRegex', message: `Invalid Regex: ${error.message}`, severity: 'error' });
        }
      }
    }
    return issues;
  },
  execute,
  getSuggestionBlueprints: ({ direction }) => {
    if (direction !== 'inputs') return [];
    return [{ id: 'mode-custom', labelSuffix: '(Custom Mode)', dataOverrides: { mode: 'custom' } }];
  },
  meta: {
    fields: async (data: RegexNodeData) => {
      const mode = data?.mode ?? 'sillytavern';
      const commonFields = [
        createFieldConfig({
          id: 'string',
          label: 'Input String',
          component: STTextarea,
          props: { rows: 3 },
        }),
        createFieldConfig({
          id: 'mode',
          label: 'Mode',
          component: STSelect,
          options: [
            { value: 'sillytavern', label: 'SillyTavern' },
            { value: 'custom', label: 'Custom' },
          ],
        }),
      ];

      const allRegexes: RegexScriptData[] = SillyTavern.getContext().extensionSettings.regex ?? [];
      const regexOptions = allRegexes.map((r) => ({ value: r.id, label: r.scriptName }));

      const modeSpecificFields =
        mode === 'sillytavern'
          ? [
              createFieldConfig({
                id: 'scriptId',
                label: 'Regex Script',
                component: STFancyDropdown,
                props: {
                  items: regexOptions,
                  multiple: false,
                  inputClasses: 'nodrag',
                  containerClasses: 'nodrag nowheel',
                  closeOnSelect: true,
                  enableSearch: true,
                },
                getValueFromEvent: (e: string[]) => e[0],
                formatValue: (value: string) => [value ?? ''],
              }),
            ]
          : [
              createFieldConfig({
                id: 'findRegex',
                label: 'Find (Regex)',
                component: STTextarea,
                props: { rows: 2 },
              }),
              createFieldConfig({
                id: 'replaceString',
                label: 'Replace',
                component: STTextarea,
                props: { rows: 2 },
              }),
            ];

      return [...commonFields, ...modeSpecificFields];
    },
  },
};

registrator.register(regexNodeDefinition);

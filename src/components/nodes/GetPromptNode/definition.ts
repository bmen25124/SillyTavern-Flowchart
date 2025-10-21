import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { settingsManager } from '../../../config.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';

export const GetPromptNodeDataSchema = z.object({
  promptName: z.string().optional(),
  _version: z.number().optional(),
});
export type GetPromptNodeData = z.infer<typeof GetPromptNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = GetPromptNodeDataSchema.parse(node.data);
  const promptName = resolveInput(input, data, 'promptName');
  if (!promptName) throw new Error('Prompt name not provided.');

  const settings = settingsManager.getSettings();
  const prompt = settings.prompts[promptName];

  if (prompt === undefined) throw new Error(`Prompt "${promptName}" not found.`);

  return { result: prompt };
};

export const getPromptNodeDefinition: NodeDefinition<GetPromptNodeData> = {
  type: 'getPromptNode',
  label: 'Get Prompt',
  category: 'User Interaction',
  component: DataDrivenNode,
  dataSchema: GetPromptNodeDataSchema,
  currentVersion: 1,
  initialData: { promptName: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'promptName', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.STRING },
    ],
  },
  validate: combineValidators(createRequiredFieldValidator('promptName', 'Prompt Name is required.')),
  execute,
  meta: {
    fields: () => {
      const prompts = settingsManager.getSettings().prompts;
      const promptOptions = Object.keys(prompts).map((name) => ({ value: name, label: name }));

      return [
        createFieldConfig({
          id: 'promptName',
          label: 'Prompt Name',
          component: STFancyDropdown,
          props: {
            items: promptOptions,
            multiple: false,
            inputClasses: 'nodrag',
            containerClasses: 'nodrag nowheel',
            closeOnSelect: true,
            enableSearch: true,
          },
          getValueFromEvent: (e: string[]) => e[0],
          formatValue: (value) => [value ?? ''],
        }),
      ];
    },
  },
};

registrator.register(getPromptNodeDefinition);

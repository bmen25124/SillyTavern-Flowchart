import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STInput, STTextarea } from 'sillytavern-utils-lib/components/react';

export const PromptUserNodeDataSchema = z.object({
  message: z.string().optional(),
  defaultValue: z.string().optional(),
  _version: z.number().optional(),
});
export type PromptUserNodeData = z.infer<typeof PromptUserNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = PromptUserNodeDataSchema.parse(node.data);

  const message = resolveInput(input, data, 'message');
  const defaultValue = resolveInput(input, data, 'defaultValue');
  if (!message) {
    throw new Error('Prompt message is required.');
  }

  const result = await dependencies.promptUser(message, defaultValue);
  return { result };
};

export const promptUserNodeDefinition: NodeDefinition<PromptUserNodeData> = {
  type: 'promptUserNode',
  label: 'Prompt User',
  category: 'User Interaction',
  component: DataDrivenNode,
  dataSchema: PromptUserNodeDataSchema,
  currentVersion: 1,
  initialData: { message: 'Please enter a value:' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'message', type: FlowDataType.STRING },
      { id: 'defaultValue', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.STRING },
    ],
  },
  validate: combineValidators(createRequiredFieldValidator('message', 'Message is required.')),
  execute,
  meta: {
    fields: [
      createFieldConfig({
        id: 'message',
        label: 'Prompt Message',
        component: STTextarea,
        props: { rows: 3 },
      }),
      createFieldConfig({
        id: 'defaultValue',
        label: 'Default Value (Optional)',
        component: STInput,
        props: { type: 'text' },
      }),
    ],
  },
};

registrator.register(promptUserNodeDefinition);

import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { UpdateChatInputNode } from './UpdateChatInputNode.js';

export const UpdateChatInputNodeDataSchema = z.object({
  value: z.string().optional(),
  _version: z.number().optional(),
});
export type UpdateChatInputNodeData = z.infer<typeof UpdateChatInputNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = UpdateChatInputNodeDataSchema.parse(node.data);
  const value = resolveInput(input, data, 'value');

  if (value === undefined || value === null) {
    throw new Error('Value to update chat input is required.');
  }

  dependencies.updateChatInputValue(String(value));
};

export const updateChatInputNodeDefinition: NodeDefinition<UpdateChatInputNodeData> = {
  type: 'updateChatInputNode',
  label: 'Update Chat Input',
  category: 'Chat',
  component: UpdateChatInputNode,
  dataSchema: UpdateChatInputNodeDataSchema,
  currentVersion: 1,
  initialData: { value: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  validate: combineValidators(createRequiredFieldValidator('value', 'Value is required.')),
  execute,
};

registrator.register(updateChatInputNodeDefinition);

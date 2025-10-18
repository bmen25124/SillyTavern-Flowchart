import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { SetLocalVariableNode } from './SetLocalVariableNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import {
  combineValidators,
  createRequiredConnectionValidator,
  createRequiredFieldValidator,
} from '../../../utils/validation-helpers.js';

export const SetLocalVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  _version: z.number().optional(),
});
export type SetLocalVariableNodeData = z.infer<typeof SetLocalVariableNodeDataSchema>;

const execute: NodeExecutor = async (node, input, context) => {
  const data = SetLocalVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  if (!variableName) throw new Error('Variable name is required.');

  if (!('value' in input)) {
    throw new Error('A value must be provided to set a local variable.');
  }

  const value = input.value;
  const args = input.args;

  if (args !== undefined && (typeof args !== 'object' || args === null)) {
    throw new Error('Args input for Set Local Variable must be an object if provided.');
  }

  await context.dependencies.st_setLocalVariable(variableName, value, args);
};

export const setLocalVariableNodeDefinition: NodeDefinition<SetLocalVariableNodeData> = {
  type: 'setLocalVariableNode',
  label: 'Set Local Variable',
  category: 'Variables',
  component: SetLocalVariableNode,
  dataSchema: SetLocalVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'chatVar' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.ANY },
      { id: 'variableName', type: FlowDataType.STRING },
      { id: 'args', type: FlowDataType.OBJECT },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  validate: combineValidators(
    createRequiredFieldValidator('variableName', 'Variable Name is required.'),
    createRequiredConnectionValidator('value', 'A value must be connected to set.'),
  ),
  execute,
};

registrator.register(setLocalVariableNodeDefinition);

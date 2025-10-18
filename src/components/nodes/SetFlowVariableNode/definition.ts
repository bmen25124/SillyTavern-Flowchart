import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { SetFlowVariableNode } from './SetFlowVariableNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import {
  combineValidators,
  createRequiredFieldValidator,
  createRequiredConnectionValidator,
} from '../../../utils/validation-helpers.js';

export const SetFlowVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  _version: z.number().optional(),
});
export type SetFlowVariableNodeData = z.infer<typeof SetFlowVariableNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { executionVariables }) => {
  const data = SetFlowVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  const value = input.value;
  if (!variableName) throw new Error('Variable name is required.');

  executionVariables.set(variableName, value);
  // Returns void. The runner handles the passthrough automatically.
};

export const setFlowVariableNodeDefinition: NodeDefinition<SetFlowVariableNodeData> = {
  type: 'setFlowVariableNode',
  label: 'Set Flow Variable',
  category: 'Variables',
  component: SetFlowVariableNode,
  dataSchema: SetFlowVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'myVar' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.ANY },
      { id: 'variableName', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  validate: combineValidators(
    createRequiredFieldValidator('variableName', 'Variable Name is required.'),
    createRequiredConnectionValidator('value', 'A value must be connected to set.'),
  ),
  execute,
};

registrator.register(setFlowVariableNodeDefinition);

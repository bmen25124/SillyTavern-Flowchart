import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { SetVariableNode } from './SetVariableNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const SetVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  _version: z.number().optional(),
});
export type SetVariableNodeData = z.infer<typeof SetVariableNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { executionVariables }) => {
  const data = SetVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  const value = input.value;
  if (!variableName) throw new Error('Variable name is required.');

  executionVariables.set(variableName, value);
  return { value }; // Passthrough
};

export const setVariableNodeDefinition: NodeDefinition<SetVariableNodeData> = {
  type: 'setVariableNode',
  label: 'Set Variable',
  category: 'Utility',
  component: SetVariableNode,
  dataSchema: SetVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'myVar' },
  handles: {
    inputs: [
      { id: 'value', type: FlowDataType.ANY },
      { id: 'variableName', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'value', type: FlowDataType.ANY }],
  },
  execute,
};

registrator.register(setVariableNodeDefinition);

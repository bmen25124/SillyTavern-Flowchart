import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, SetVariableNodeDataSchema } from '../../../flow-types.js';
import { SetVariableNode } from './SetVariableNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const resolveInput = <T extends object, K extends keyof T>(input: Record<string, any>, staticData: T, key: K): T[K] =>
  input[key as string] ?? staticData[key];

const execute: NodeExecutor = async (node, input, { executionVariables }) => {
  const data = SetVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  const value = input.value;
  if (!variableName) throw new Error('Variable name is required.');

  executionVariables.set(variableName, value);
  return { value }; // Passthrough
};

export const setVariableNodeDefinition: NodeDefinition = {
  type: 'setVariableNode',
  label: 'Set Variable',
  category: 'Utility',
  component: SetVariableNode,
  dataSchema: SetVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'myVar', _version: 1 },
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

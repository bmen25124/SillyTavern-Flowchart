import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, GetVariableNodeDataSchema } from '../../../flow-types.js';
import { GetVariableNode } from './GetVariableNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

const execute: NodeExecutor = async (node, input, { executionVariables }) => {
  const data = GetVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  if (!variableName) throw new Error('Variable name is required.');
  if (!executionVariables.has(variableName)) throw new Error(`Execution variable "${variableName}" not found.`);
  return { value: executionVariables.get(variableName) };
};

export const getVariableNodeDefinition: NodeDefinition = {
  type: 'getVariableNode',
  label: 'Get Variable',
  category: 'Utility',
  component: GetVariableNode,
  dataSchema: GetVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'myVar', _version: 1 },
  handles: {
    inputs: [{ id: 'variableName', type: FlowDataType.STRING }],
    outputs: [{ id: 'value', type: FlowDataType.ANY }],
  },
  execute,
};

registrator.register(getVariableNodeDefinition);

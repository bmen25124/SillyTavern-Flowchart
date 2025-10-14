import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { GetVariableNode } from './GetVariableNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const GetVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  _version: z.number().optional(),
});
export type GetVariableNodeData = z.infer<typeof GetVariableNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { executionVariables }) => {
  const data = GetVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  if (!variableName) throw new Error('Variable name is required.');
  if (!executionVariables.has(variableName)) throw new Error(`Execution variable "${variableName}" not found.`);
  return { value: executionVariables.get(variableName) };
};

export const getVariableNodeDefinition: NodeDefinition<GetVariableNodeData> = {
  type: 'getVariableNode',
  label: 'Get Variable',
  category: 'Utility',
  component: GetVariableNode,
  dataSchema: GetVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'myVar' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'variableName', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.ANY },
    ],
  },
  execute,
};

registrator.register(getVariableNodeDefinition);

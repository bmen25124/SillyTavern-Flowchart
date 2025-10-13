import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { ExecuteJsNode } from './ExecuteJsNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

export const ExecuteJsNodeDataSchema = z.object({
  code: z.string().default('return input;'),
  _version: z.number().optional(),
});
export type ExecuteJsNodeData = z.infer<typeof ExecuteJsNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies, executionVariables }) => {
  const data = ExecuteJsNodeDataSchema.parse(node.data);
  const variables = { ...Object.fromEntries(executionVariables) };
  try {
    const func = new Function('input', 'variables', 'stContext', data.code);
    return func(input, variables, dependencies.getSillyTavernContext());
  } catch (error: any) {
    throw new Error(`Error executing JS code: ${error.message}`);
  }
};

export const executeJsNodeDefinition: NodeDefinition<ExecuteJsNodeData> = {
  type: 'executeJsNode',
  label: 'Execute JS Code',
  category: 'Utility',
  component: ExecuteJsNode,
  dataSchema: ExecuteJsNodeDataSchema,
  currentVersion: 1,
  initialData: { code: 'return input;' },
  handles: {
    inputs: [{ id: null, type: FlowDataType.ANY }],
    outputs: [{ id: null, type: FlowDataType.ANY }],
  },
  execute,
};

registrator.register(executeJsNodeDefinition);

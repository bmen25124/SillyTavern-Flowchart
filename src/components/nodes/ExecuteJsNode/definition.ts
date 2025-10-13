import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, ExecuteJsNodeDataSchema } from '../../../flow-types.js';
import { ExecuteJsNode } from './ExecuteJsNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

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

export const executeJsNodeDefinition: NodeDefinition = {
  type: 'executeJsNode',
  label: 'Execute JS Code',
  category: 'Utility',
  component: ExecuteJsNode,
  dataSchema: ExecuteJsNodeDataSchema,
  currentVersion: 1,
  initialData: { code: 'return input;', _version: 1 },
  handles: {
    inputs: [{ id: null, type: FlowDataType.ANY }],
    outputs: [{ id: null, type: FlowDataType.ANY }],
  },
  execute,
};

registrator.register(executeJsNodeDefinition);

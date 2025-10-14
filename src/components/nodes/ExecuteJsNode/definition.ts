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

  // If a 'main' input is connected, pass its value as the primary `input` argument to the script.
  // Otherwise, pass the whole object of named inputs. This provides an intuitive scripting experience.
  const scriptInput = input.main ?? input;

  try {
    const func = new Function('input', 'variables', 'stContext', data.code);
    return func(scriptInput, variables, dependencies.getSillyTavernContext());
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
    inputs: [{ id: 'main', type: FlowDataType.ANY }],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  execute,
  isDangerous: true,
};

registrator.register(executeJsNodeDefinition);

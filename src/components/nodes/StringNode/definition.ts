import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, StringNodeDataSchema } from '../../../flow-types.js';
import { StringNode } from './StringNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const execute: NodeExecutor = async (node, input) => {
  const data = StringNodeDataSchema.parse(node.data);
  const value = input.value ?? data.value;
  return { value: String(value) };
};

export const stringNodeDefinition: NodeDefinition = {
  type: 'stringNode',
  label: 'String',
  category: 'Input',
  component: StringNode,
  dataSchema: StringNodeDataSchema,
  currentVersion: 1,
  initialData: { value: 'hello', _version: 1 },
  handles: {
    inputs: [{ id: 'value', type: FlowDataType.ANY }],
    outputs: [{ id: 'value', type: FlowDataType.STRING }],
  },
  execute,
};

registrator.register(stringNodeDefinition);

import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, NumberNodeDataSchema } from '../../../flow-types.js';
import { NumberNode } from './NumberNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const execute: NodeExecutor = async (node, input) => {
  const data = NumberNodeDataSchema.parse(node.data);
  const value = input.value ?? data.value;
  return { value: Number(value) };
};

export const numberNodeDefinition: NodeDefinition = {
  type: 'numberNode',
  label: 'Number',
  category: 'Input',
  component: NumberNode,
  dataSchema: NumberNodeDataSchema,
  currentVersion: 1,
  initialData: { value: 123, _version: 1 },
  handles: {
    inputs: [{ id: 'value', type: FlowDataType.ANY }],
    outputs: [{ id: 'value', type: FlowDataType.NUMBER }],
  },
  execute,
};

registrator.register(numberNodeDefinition);

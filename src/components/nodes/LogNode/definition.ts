import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, LogNodeDataSchema } from '../../../flow-types.js';
import { LogNode } from './LogNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const execute: NodeExecutor = async (node, input) => {
  const data = LogNodeDataSchema.parse(node.data);
  console.log(data.prefix, input.value);
  return { value: input.value }; // Pass the value through
};

export const logNodeDefinition: NodeDefinition = {
  type: 'logNode',
  label: 'Log',
  category: 'Utility',
  component: LogNode,
  dataSchema: LogNodeDataSchema,
  currentVersion: 1,
  initialData: { prefix: 'Log:', _version: 1 },
  handles: {
    inputs: [{ id: 'value', type: FlowDataType.ANY }],
    outputs: [{ id: 'value', type: FlowDataType.ANY }],
  },
  execute,
};

registrator.register(logNodeDefinition);

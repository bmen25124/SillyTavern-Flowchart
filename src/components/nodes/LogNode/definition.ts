import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { LogNode } from './LogNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

export const LogNodeDataSchema = z.object({
  prefix: z.string().default('Log:'),
  _version: z.number().optional(),
});
export type LogNodeData = z.infer<typeof LogNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = LogNodeDataSchema.parse(node.data);
  console.log(data.prefix, input.main);
  // Returns void. The runner handles the passthrough automatically.
};

export const logNodeDefinition: NodeDefinition<LogNodeData> = {
  type: 'logNode',
  label: 'Log',
  category: 'Utility',
  component: LogNode,
  dataSchema: LogNodeDataSchema,
  currentVersion: 1,
  initialData: { prefix: 'Log:' },
  handles: {
    inputs: [{ id: 'main', type: FlowDataType.ANY }],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  execute,
};

registrator.register(logNodeDefinition);

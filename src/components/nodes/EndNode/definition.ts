import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { EndNode } from './EndNode.js';
import { FlowDataType } from '../../../flow-types.js';

export const END_NODE_SENTINEL = Symbol('FlowTerminationSentinel');

export const EndNodeDataSchema = z.object({
  _version: z.number().optional(),
});
export type EndNodeData = z.infer<typeof EndNodeDataSchema>;

const execute: NodeExecutor = async () => {
  return END_NODE_SENTINEL;
};

export const endNodeDefinition: NodeDefinition<EndNodeData> = {
  type: 'endNode',
  label: 'End Flow',
  category: 'Logic',
  component: EndNode,
  dataSchema: EndNodeDataSchema,
  currentVersion: 1,
  initialData: {},
  handles: {
    inputs: [{ id: 'main', type: FlowDataType.ANY }],
    outputs: [],
  },
  execute,
};

registrator.register(endNodeDefinition);

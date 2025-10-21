import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { SimpleDisplayNode } from '../SimpleDisplayNode.js';

export const OnStreamTriggerNodeDataSchema = z.object({
  _version: z.number().optional(),
});
export type OnStreamTriggerNodeData = z.infer<typeof OnStreamTriggerNodeDataSchema>;

const execute: NodeExecutor = async (_node, input) => {
  // This trigger's job is simply to expose the input from the sub-flow call as named outputs.
  return { ...input };
};

export const onStreamTriggerNodeDefinition: NodeDefinition<OnStreamTriggerNodeData> = {
  type: 'onStreamTriggerNode',
  label: 'On Stream Trigger',
  category: 'Trigger',
  component: SimpleDisplayNode,
  dataSchema: OnStreamTriggerNodeDataSchema,
  currentVersion: 1,
  initialData: {},
  handles: {
    inputs: [],
    outputs: [
      { id: 'chunk', type: FlowDataType.STRING, label: 'Chunk' },
      { id: 'fullText', type: FlowDataType.STRING, label: 'Full Text' },
    ],
  },
  execute,
  meta: {
    description: 'Starts a flow for each token from an LLM stream.',
  },
};

registrator.register(onStreamTriggerNodeDefinition);

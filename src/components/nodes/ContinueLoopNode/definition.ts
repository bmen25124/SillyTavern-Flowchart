import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { SimpleDisplayNode } from '../SimpleDisplayNode.js';
import { CONTINUE_LOOP_SENTINEL } from '../ForEachNode/definition.js';

export const ContinueLoopNodeDataSchema = z.object({
  _version: z.number().optional(),
});
export type ContinueLoopNodeData = z.infer<typeof ContinueLoopNodeDataSchema>;

const execute: NodeExecutor = async () => {
  return CONTINUE_LOOP_SENTINEL;
};

export const continueLoopNodeDefinition: NodeDefinition<ContinueLoopNodeData> = {
  type: 'continueLoopNode',
  label: 'Continue Loop',
  category: 'Logic',
  component: SimpleDisplayNode,
  dataSchema: ContinueLoopNodeDataSchema,
  currentVersion: 1,
  initialData: {},
  handles: {
    inputs: [{ id: 'main', type: FlowDataType.ANY }],
    outputs: [],
  },
  execute,
  meta: {
    description: 'Skips to the next item in the "For Each" loop.',
  },
};

registrator.register(continueLoopNodeDefinition);

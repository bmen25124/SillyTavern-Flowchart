import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { BreakLoopNode } from './BreakLoopNode.js';
import { BREAK_LOOP_SENTINEL } from '../ForEachNode/definition.js';

export const BreakLoopNodeDataSchema = z.object({
  _version: z.number().optional(),
});
export type BreakLoopNodeData = z.infer<typeof BreakLoopNodeDataSchema>;

const execute: NodeExecutor = async () => {
  return BREAK_LOOP_SENTINEL;
};

export const breakLoopNodeDefinition: NodeDefinition<BreakLoopNodeData> = {
  type: 'breakLoopNode',
  label: 'Break Loop',
  category: 'Logic',
  component: BreakLoopNode,
  dataSchema: BreakLoopNodeDataSchema,
  currentVersion: 1,
  initialData: {},
  handles: {
    inputs: [{ id: 'main', type: FlowDataType.ANY }],
    outputs: [], // This is a terminal node within the sub-flow
  },
  execute,
};

registrator.register(breakLoopNodeDefinition);

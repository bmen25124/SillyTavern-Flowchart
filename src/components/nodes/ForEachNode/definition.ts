import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { ForEachNode } from './ForEachNode.js';
import {
  combineValidators,
  createRequiredFieldValidator,
  createRequiredConnectionValidator,
} from '../../../utils/validation-helpers.js';

export const BREAK_LOOP_SENTINEL = Symbol('FlowLoopBreakSentinel');
export const CONTINUE_LOOP_SENTINEL = Symbol('FlowLoopContinueSentinel');

export const ForEachNodeDataSchema = z.object({
  flowId: z.string().optional(),
  _version: z.number().optional(),
});
export type ForEachNodeData = z.infer<typeof ForEachNodeDataSchema>;

const execute: NodeExecutor = async (node, input, context) => {
  const data = ForEachNodeDataSchema.parse(node.data);
  const flowId = resolveInput(input, data, 'flowId');
  const array = input.array;

  if (!flowId) throw new Error('Flow ID is required.');
  if (!Array.isArray(array)) throw new Error('An array must be connected to the "Array" input.');

  const results = [];
  let index = 0;
  for (const item of array) {
    // Check for abort signal before each iteration.
    if (context.signal?.aborted) {
      throw new DOMException('Flow execution was aborted.', 'AbortError');
    }

    const subFlowInput = { item, index };
    const report = await context.dependencies.executeSubFlow(
      flowId,
      subFlowInput,
      context.depth + 1,
      context.executionPath,
      context.runId,
    );

    if (report.error) {
      throw new Error(`Sub-flow execution for item ${index} failed: ${report.error.message}`);
    }

    // Check for sentinels
    if (report.lastOutput === BREAK_LOOP_SENTINEL) {
      break; // Exit the loop
    }
    if (report.lastOutput === CONTINUE_LOOP_SENTINEL) {
      index++;
      continue; // Skip to the next iteration
    }

    results.push(report.lastOutput);
    index++;
  }

  // This output contains an array of the `lastOutput` from each sub-flow run.
  return { results };
};

export const forEachNodeDefinition: NodeDefinition<ForEachNodeData> = {
  type: 'forEachNode',
  label: 'For Each',
  category: 'Logic',
  component: ForEachNode,
  dataSchema: ForEachNodeDataSchema,
  currentVersion: 1,
  initialData: {},
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'array', type: FlowDataType.ARRAY },
      { id: 'flowId', type: FlowDataType.FLOW_ID },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY }, // Passthrough for after the loop completes
      { id: 'results', type: FlowDataType.ARRAY, schema: z.array(z.any()) },
    ],
  },
  validate: combineValidators(
    createRequiredFieldValidator('flowId', 'A flow must be selected to run for each item.'),
    createRequiredConnectionValidator('array', 'An array must be connected to iterate over.'),
  ),
  execute,
};

registrator.register(forEachNodeDefinition);

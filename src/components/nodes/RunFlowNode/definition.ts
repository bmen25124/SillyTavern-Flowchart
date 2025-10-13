import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { RunFlowNode } from './RunFlowNode.js';

export const RunFlowNodeDataSchema = z.object({
  flowId: z.string().optional(),
  parameters: z.string().default('{}'),
  _version: z.number().optional(),
});
export type RunFlowNodeData = z.infer<typeof RunFlowNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies, depth }) => {
  const data = RunFlowNodeDataSchema.parse(node.data);
  const flowId = resolveInput(input, data, 'flowId');
  if (!flowId) throw new Error('Flow ID/Name is required.');

  let params = {};
  const paramsString = resolveInput(input, data, 'parameters');
  try {
    params = typeof paramsString === 'object' ? paramsString : JSON.parse(paramsString || '{}');
  } catch (e: any) {
    throw new Error(`Invalid JSON in parameters: ${e.message}`);
  }

  const report = await dependencies.executeSubFlow(flowId, params, depth + 1);

  if (report.error) {
    throw new Error(`Sub-flow "${flowId}" failed: ${report.error.message}`);
  }

  return { result: report.lastOutput };
};

export const runFlowNodeDefinition: NodeDefinition<RunFlowNodeData> = {
  type: 'runFlowNode',
  label: 'Run Flow',
  category: 'Utility',
  component: RunFlowNode,
  dataSchema: RunFlowNodeDataSchema,
  currentVersion: 1,
  initialData: { flowId: '', parameters: '{}' },
  handles: {
    inputs: [
      { id: 'flowId', type: FlowDataType.STRING },
      { id: 'parameters', type: FlowDataType.OBJECT },
    ],
    outputs: [{ id: 'result', type: FlowDataType.ANY }],
  },
  execute,
};

registrator.register(runFlowNodeDefinition);

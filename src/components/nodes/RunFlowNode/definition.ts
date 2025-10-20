import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { RunFlowNode } from './RunFlowNode.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { applySchema, resolveSchemaFromHandle } from '../../../utils/schema-builder.js';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';
import { createDynamicOutputHandlesForSchema } from '../../../utils/handle-logic.js';

export const RunFlowNodeDataSchema = z.object({
  flowId: z.string().optional(),
  parameters: z.string().default('{}'),
  _version: z.number().optional(),
});
export type RunFlowNodeData = z.infer<typeof RunFlowNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies, depth, executionPath }) => {
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

  const schema = input.schema;

  const report = await dependencies.executeSubFlow(flowId, params, depth + 1, executionPath);

  if (report.error) {
    throw new Error(`Sub-flow "${flowId}" failed: ${report.error.message}`);
  }

  const finalOutput = applySchema(report.lastOutput, schema, 'Run Flow');

  if (typeof finalOutput === 'object' && finalOutput !== null) {
    return { ...finalOutput, result: finalOutput };
  }

  return { result: finalOutput };
};

export const runFlowNodeDefinition: NodeDefinition<RunFlowNodeData> = {
  type: 'runFlowNode',
  label: 'Run Flow',
  category: 'System',
  component: RunFlowNode,
  dataSchema: RunFlowNodeDataSchema,
  currentVersion: 2,
  initialData: { flowId: '', parameters: '{}' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'flowId', type: FlowDataType.FLOW_ID },
      { id: 'parameters', type: FlowDataType.OBJECT },
      { id: 'schema', type: FlowDataType.SCHEMA },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.ANY },
    ],
  },
  validate: combineValidators(createRequiredFieldValidator('flowId', 'Flow to Run is required.')),
  execute,
  getDynamicHandles: (node, allNodes, allEdges) => {
    const schema = resolveSchemaFromHandle(node, allNodes, allEdges, 'schema');
    if (!schema) {
      return { inputs: [], outputs: [] };
    }

    const resultHandle = { id: 'result', type: zodTypeToFlowType(schema), schema };
    const propertyHandles = createDynamicOutputHandlesForSchema(schema);

    return { inputs: [], outputs: [resultHandle, ...propertyHandles] };
  },
};

registrator.register(runFlowNodeDefinition);

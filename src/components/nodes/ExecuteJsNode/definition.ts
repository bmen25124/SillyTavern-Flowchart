import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { ExecuteJsNode } from './ExecuteJsNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { applySchema, resolveSchemaFromHandle } from '../../../utils/schema-builder.js';
import { createDynamicOutputHandlesForSchema } from '../../../utils/handle-logic.js';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';

export const ExecuteJsNodeDataSchema = z.object({
  code: z.string().default('return input;'),
  _version: z.number().optional(),
});
export type ExecuteJsNodeData = z.infer<typeof ExecuteJsNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies, executionVariables }) => {
  const data = ExecuteJsNodeDataSchema.parse(node.data);
  const variables = { ...Object.fromEntries(executionVariables) };
  const schema = input.schema;

  const scriptInput = input.scriptInput;

  let result;
  try {
    const func = new Function('input', 'variables', 'stContext', data.code);
    result = await func(scriptInput, variables, dependencies.getSillyTavernContext());
  } catch (error: unknown) {
    const e = error as Error;
    throw new Error(`Error executing JS code: ${e.message}`);
  }

  const finalOutput = applySchema(result, schema, 'Execute JS Code');

  if (typeof finalOutput === 'object' && finalOutput !== null) {
    return { ...finalOutput, result: finalOutput };
  }
  return { result: finalOutput };
};

export const executeJsNodeDefinition: NodeDefinition<ExecuteJsNodeData> = {
  type: 'executeJsNode',
  label: 'Execute JS Code',
  category: 'System',
  component: ExecuteJsNode,
  dataSchema: ExecuteJsNodeDataSchema,
  currentVersion: 1,
  initialData: { code: 'return {\n  "message": "Hello " + input.name\n};' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'scriptInput', type: FlowDataType.ANY },
      { id: 'schema', type: FlowDataType.SCHEMA },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  execute,
  isDangerous: true,
  getDynamicHandles: (node, allNodes: Node[], allEdges: Edge[]) => {
    const schema = resolveSchemaFromHandle(node, allNodes, allEdges, 'schema');
    if (!schema) {
      return { inputs: [], outputs: [{ id: 'result', type: FlowDataType.ANY }] };
    }

    const resultHandle = { id: 'result', type: zodTypeToFlowType(schema), schema };
    const propertyHandles = createDynamicOutputHandlesForSchema(schema);

    return { inputs: [], outputs: [resultHandle, ...propertyHandles] };
  },
};

registrator.register(executeJsNodeDefinition);

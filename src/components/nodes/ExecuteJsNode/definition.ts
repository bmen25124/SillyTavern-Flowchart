import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { ExecuteJsNode } from './ExecuteJsNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { FieldDefinition } from '../SchemaNode/definition.js';
import { buildZodSchema, buildZodSchemaFromFields } from '../../../utils/schema-builder.js';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';

export const ExecuteJsNodeDataSchema = z.object({
  code: z.string().default('return input;'),
  _version: z.number().optional(),
});
export type ExecuteJsNodeData = z.infer<typeof ExecuteJsNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies, executionVariables }) => {
  const data = ExecuteJsNodeDataSchema.parse(node.data);
  const variables = { ...Object.fromEntries(executionVariables) };
  const providedSchema = input.schema;

  const scriptInput = input.scriptInput ?? input;

  let result;
  try {
    const func = new Function('input', 'variables', 'stContext', data.code);
    result = await func(scriptInput, variables, dependencies.getSillyTavernContext());
  } catch (error: any) {
    throw new Error(`Error executing JS code: ${error.message}`);
  }

  if (providedSchema instanceof z.ZodType) {
    const validation = providedSchema.safeParse(result);
    if (!validation.success) {
      console.error('JS Node Output Validation Error:', validation.error);
      throw new Error(`JavaScript execution result failed schema validation: ${validation.error.message}`);
    }
    return { ...(validation.data as any), result: validation.data };
  }

  return result;
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
    const schemaEdge = allEdges.find((edge) => edge.target === node.id && edge.targetHandle === 'schema');
    if (!schemaEdge) {
      return { inputs: [], outputs: [{ id: 'result', type: FlowDataType.ANY }] };
    }

    const schemaNode = allNodes.find((n) => n.id === schemaEdge.source);
    if (schemaNode?.type !== 'schemaNode' || !Array.isArray(schemaNode.data.fields)) {
      return { inputs: [], outputs: [{ id: 'result', type: FlowDataType.ANY }] };
    }

    const fields = schemaNode.data.fields as FieldDefinition[];
    const fullSchema = buildZodSchemaFromFields(fields);
    const resultHandle = { id: 'result', type: FlowDataType.OBJECT, schema: fullSchema };

    const fieldHandles = fields.map((field) => ({
      id: field.name,
      type: zodTypeToFlowType(buildZodSchema(field)),
      schema: buildZodSchema(field),
    }));

    return { inputs: [], outputs: [resultHandle, ...fieldHandles] };
  },
};

registrator.register(executeJsNodeDefinition);

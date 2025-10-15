import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { ExecuteJsNode } from './ExecuteJsNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { FieldDefinition } from '../SchemaNode/definition.js';

export const ExecuteJsNodeDataSchema = z.object({
  code: z.string().default('return input;'),
  _version: z.number().optional(),
});
export type ExecuteJsNodeData = z.infer<typeof ExecuteJsNodeDataSchema>;

// Helper functions to build a Zod schema from a SchemaNode's data structure.
// This is necessary to dynamically generate typed outputs.
function buildZodSchema(definition: any): z.ZodTypeAny {
  let zodType: z.ZodTypeAny;
  switch (definition.type) {
    case 'string':
      zodType = z.string();
      break;
    case 'number':
      zodType = z.number();
      break;
    case 'boolean':
      zodType = z.boolean();
      break;
    case 'enum':
      zodType = z.enum(definition.values as [string, ...string[]]);
      break;
    case 'object':
      zodType = buildZodSchemaFromFields(definition.fields || []);
      break;
    case 'array':
      zodType = z.array(definition.items ? buildZodSchema(definition.items) : z.any());
      break;
    default:
      zodType = z.any();
  }
  if (definition.description) {
    return zodType.describe(definition.description);
  }
  return zodType;
}

function buildZodSchemaFromFields(fields: FieldDefinition[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.name] = buildZodSchema(field);
  }
  return z.object(shape);
}

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
    // If validation succeeds, return the parsed (and potentially transformed) data.
    return { ...(validation.data as any), result: validation.data };
  }

  // If no schema, return the raw result.
  return result;
};

export const executeJsNodeDefinition: NodeDefinition<ExecuteJsNodeData> = {
  type: 'executeJsNode',
  label: 'Execute JS Code',
  category: 'Utility',
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
      type:
        field.type === 'string'
          ? FlowDataType.STRING
          : field.type === 'number'
            ? FlowDataType.NUMBER
            : FlowDataType.OBJECT,
      schema: buildZodSchema(field),
    }));

    return { inputs: [], outputs: [resultHandle, ...fieldHandles] };
  },
};

registrator.register(executeJsNodeDefinition);

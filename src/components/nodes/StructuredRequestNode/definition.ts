import { Node, Edge } from '@xyflow/react';
import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, StructuredRequestNodeDataSchema, FieldDefinition } from '../../../flow-types.js';
import { StructuredRequestNode } from './StructuredRequestNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { PromptEngineeringMode } from '../../../config.js';
import { resolveInput } from '../../../utils/node-logic.js';

function zodTypeToFlowType(type: z.ZodType): FlowDataType {
  if (type instanceof z.ZodNumber) return FlowDataType.NUMBER;
  if (type instanceof z.ZodString) return FlowDataType.STRING;
  if (type instanceof z.ZodBoolean) return FlowDataType.BOOLEAN;
  return FlowDataType.OBJECT;
}

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

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = StructuredRequestNodeDataSchema.parse(node.data);
  const profileId = resolveInput(input, data, 'profileId');
  const schemaName = resolveInput(input, data, 'schemaName');
  const maxResponseToken = resolveInput(input, data, 'maxResponseToken');
  const promptEngineeringMode = resolveInput(input, data, 'promptEngineeringMode');
  const { messages, schema } = input;

  if (!profileId || !schema || !messages || maxResponseToken === undefined) {
    throw new Error('Missing required inputs: profileId, schema, messages, and maxResponseToken.');
  }
  const result = await dependencies.makeStructuredRequest(
    profileId,
    messages,
    schema,
    schemaName || 'response',
    promptEngineeringMode,
    maxResponseToken,
  );
  return { ...result, result };
};

export const structuredRequestNodeDefinition: NodeDefinition = {
  type: 'structuredRequestNode',
  label: 'Structured Request',
  category: 'API Request',
  component: StructuredRequestNode,
  dataSchema: StructuredRequestNodeDataSchema,
  currentVersion: 1,
  initialData: {
    profileId: '',
    schemaName: 'mySchema',
    promptEngineeringMode: PromptEngineeringMode.NATIVE,
    maxResponseToken: 1000,
    _version: 1,
  },
  handles: {
    inputs: [
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
      { id: 'messages', type: FlowDataType.MESSAGES },
      { id: 'schema', type: FlowDataType.SCHEMA },
      { id: 'maxResponseToken', type: FlowDataType.NUMBER },
      { id: 'promptEngineeringMode', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'result', type: FlowDataType.STRUCTURED_RESULT }],
  },
  execute,
  getDynamicHandles: (node, allNodes: Node[], allEdges: Edge[]) => {
    const schemaEdge = allEdges.find((edge) => edge.target === node.id && edge.targetHandle === 'schema');
    if (!schemaEdge) return { inputs: [], outputs: [] };

    const schemaNode = allNodes.find((n) => n.id === schemaEdge.source);
    if (schemaNode?.type !== 'schemaNode' || !Array.isArray(schemaNode.data.fields)) return { inputs: [], outputs: [] };

    const schema = buildZodSchemaFromFields(schemaNode.data.fields);
    const resultHandle = { id: 'result', type: FlowDataType.STRUCTURED_RESULT, schema };
    const fieldHandles = (schemaNode.data.fields as FieldDefinition[]).map((field) => ({
      id: field.name,
      type: zodTypeToFlowType(buildZodSchema(field)),
      schema: buildZodSchema(field),
    }));

    return { inputs: [], outputs: [resultHandle, ...fieldHandles] };
  },
  getHandleType: ({ handleId, handleDirection, node, nodes, edges }) => {
    if (handleDirection !== 'output') return undefined;
    if (handleId === 'result') return FlowDataType.STRUCTURED_RESULT;

    const schemaEdge = edges.find((edge) => edge.target === node.id && edge.targetHandle === 'schema');
    if (!schemaEdge) return undefined;

    const schemaNode = nodes.find((n) => n.id === schemaEdge.source);
    if (schemaNode?.type !== 'schemaNode' || !Array.isArray(schemaNode.data.fields)) return undefined;

    const field = schemaNode.data.fields.find((f: any) => f.name === handleId);
    if (!field) return undefined;

    return zodTypeToFlowType(buildZodSchema(field));
  },
};

registrator.register(structuredRequestNodeDefinition);

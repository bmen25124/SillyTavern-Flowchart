import { Node, Edge } from '@xyflow/react';
import { z } from 'zod';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { LLMRequestNode } from './LLMRequestNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { PromptEngineeringMode } from '../../../config.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { FieldDefinition } from '../SchemaNode/definition.js';

export const LLMRequestNodeDataSchema = z.object({
  profileId: z.string().default(''),
  schemaName: z.string().default('responseSchema'),
  promptEngineeringMode: z.enum(PromptEngineeringMode).default(PromptEngineeringMode.NATIVE),
  maxResponseToken: z.number().default(1000),
  stream: z.boolean().default(false),
  _version: z.number().optional(),
});
export type LLMRequestNodeData = z.infer<typeof LLMRequestNodeDataSchema>;

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

const execute: NodeExecutor = async (node, input, { dependencies, signal }) => {
  const data = LLMRequestNodeDataSchema.parse(node.data);
  const profileId = resolveInput(input, data, 'profileId');
  const maxResponseToken = resolveInput(input, data, 'maxResponseToken');
  const stream = resolveInput(input, data, 'stream');
  const messageIdToUpdate = input.messageIdToUpdate;
  const { messages, schema } = input;

  if (!profileId || !messages || maxResponseToken === undefined) {
    throw new Error('Missing required inputs: profileId, messages, and maxResponseToken.');
  }

  if (schema) {
    // Streaming is not supported for structured requests
    const schemaName = resolveInput(input, data, 'schemaName');
    const promptEngineeringMode = resolveInput(input, data, 'promptEngineeringMode');
    const result = await dependencies.makeStructuredRequest(
      profileId,
      messages,
      schema,
      schemaName || 'response',
      promptEngineeringMode,
      maxResponseToken,
      signal,
    );
    return { ...result, result };
  } else {
    let onStream: ((chunk: string) => void) | undefined;
    if (stream && typeof messageIdToUpdate === 'number') {
      const { chat } = dependencies.getSillyTavernContext();
      const messageToUpdate = chat[messageIdToUpdate];
      if (!messageToUpdate) {
        throw new Error(`Message with ID ${messageIdToUpdate} not found for streaming.`);
      }

      onStream = (fullText: string) => {
        const updatedMessage = { ...messageToUpdate, mes: fullText };
        dependencies.st_updateMessageBlock(messageIdToUpdate, updatedMessage, { rerenderMessage: true });
      };
    }

    const result = await dependencies.makeSimpleRequest(profileId, messages, maxResponseToken, onStream, signal);

    // Final update to ensure the message is saved correctly.
    if (onStream && typeof messageIdToUpdate === 'number') {
      const { chat } = dependencies.getSillyTavernContext();
      const finalMessage = { ...chat[messageIdToUpdate], mes: result };
      dependencies.st_updateMessageBlock(messageIdToUpdate, finalMessage, { rerenderMessage: true });
      await dependencies.saveChat();
    }

    return { result };
  }
};

export const llmRequestNodeDefinition: NodeDefinition<LLMRequestNodeData> = {
  type: 'llmRequestNode',
  label: 'LLM Request',
  category: 'API Request',
  component: LLMRequestNode,
  dataSchema: LLMRequestNodeDataSchema,
  currentVersion: 1,
  initialData: {
    profileId: '',
    schemaName: 'mySchema',
    promptEngineeringMode: PromptEngineeringMode.NATIVE,
    maxResponseToken: 1000,
    stream: false,
  },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
      { id: 'messages', type: FlowDataType.MESSAGES },
      { id: 'schema', type: FlowDataType.SCHEMA },
      { id: 'maxResponseToken', type: FlowDataType.NUMBER },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.ANY },
    ],
  },
  validate: (node: Node<LLMRequestNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const isProfileIdConnected = edges.some((edge) => edge.target === node.id && edge.targetHandle === 'profileId');
    if (!node.data.profileId && !isProfileIdConnected) {
      issues.push({
        fieldId: 'profileId',
        message: 'Connection Profile is required.',
        severity: 'error',
      });
    }
    const isMessagesConnected = edges.some((edge) => edge.target === node.id && edge.targetHandle === 'messages');
    if (!isMessagesConnected) {
      issues.push({
        message: 'A "Messages" input is required.',
        severity: 'error',
      });
    }
    if (node.data.stream && edges.some((edge) => edge.target === node.id && edge.targetHandle === 'schema')) {
      issues.push({
        message: 'Streaming is not supported for structured (schema-based) requests.',
        severity: 'error',
      });
    }
    return issues;
  },
  execute,
  getDynamicHandles: (node, allNodes: Node[], allEdges: Edge[]) => {
    const schemaEdge = allEdges.find((edge) => edge.target === node.id && edge.targetHandle === 'schema');
    const isSchemaConnected = !!schemaEdge;
    const isStreaming = node.data.stream;

    // --- Dynamic Inputs ---
    const dynamicInputs = [];
    if (isSchemaConnected) {
      dynamicInputs.push({ id: 'schemaName', type: FlowDataType.STRING });
      dynamicInputs.push({ id: 'promptEngineeringMode', type: FlowDataType.STRING });
    }
    if (!isSchemaConnected) {
      dynamicInputs.push({ id: 'stream', type: FlowDataType.BOOLEAN });
    }
    if (isStreaming && !isSchemaConnected) {
      dynamicInputs.push({ id: 'messageIdToUpdate', type: FlowDataType.NUMBER });
    }

    // --- Dynamic Outputs ---
    if (!isSchemaConnected) {
      return { inputs: dynamicInputs, outputs: [{ id: 'result', type: FlowDataType.STRING }] };
    }

    const schemaNode = allNodes.find((n) => n.id === schemaEdge.source);
    if (schemaNode?.type !== 'schemaNode' || !Array.isArray(schemaNode.data.fields)) {
      return { inputs: dynamicInputs, outputs: [{ id: 'result', type: FlowDataType.STRING }] };
    }

    const fullSchema = buildZodSchemaFromFields(schemaNode.data.fields as FieldDefinition[]);
    const resultHandle = { id: 'result', type: FlowDataType.STRUCTURED_RESULT, schema: fullSchema };

    const fieldHandles = (schemaNode.data.fields as FieldDefinition[]).map((field) => ({
      id: field.name,
      type: zodTypeToFlowType(buildZodSchema(field)),
      schema: buildZodSchema(field),
    }));

    return { inputs: dynamicInputs, outputs: [resultHandle, ...fieldHandles] };
  },
  getHandleType: ({ handleId, handleDirection, node, nodes, edges }) => {
    if (handleDirection !== 'output') return undefined;

    const schemaEdge = edges.find((edge) => edge.target === node.id && edge.targetHandle === 'schema');
    if (!schemaEdge) {
      return handleId === 'result' ? FlowDataType.STRING : undefined;
    }
    if (handleId === 'result') return FlowDataType.STRUCTURED_RESULT;

    const schemaNode = nodes.find((n) => n.id === schemaEdge.source);
    if (schemaNode?.type !== 'schemaNode' || !Array.isArray(schemaNode.data.fields)) return undefined;

    const field = schemaNode.data.fields.find((f: any) => f.name === handleId);
    if (!field) return undefined;

    return zodTypeToFlowType(buildZodSchema(field));
  },
};

registrator.register(llmRequestNodeDefinition);

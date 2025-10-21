import { Node, Edge } from '@xyflow/react';
import { z } from 'zod';
import { NodeDefinition, ValidationIssue, HandleSpec } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { LLMRequestNode } from './LLMRequestNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { PromptEngineeringMode, settingsManager } from '../../../config.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { notify } from '../../../utils/notify.js';
import { resolveSchemaFromHandle } from '../../../utils/schema-builder.js';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';
import {
  combineValidators,
  createRequiredConnectionValidator,
  createRequiredFieldValidator,
} from '../../../utils/validation-helpers.js';
import { createDynamicOutputHandlesForSchema } from '../../../utils/handle-logic.js';

export const LLMRequestNodeDataSchema = z.object({
  profileId: z.string().default(''),
  schemaName: z.string().default('responseSchema'),
  promptEngineeringMode: z.enum(PromptEngineeringMode).default(PromptEngineeringMode.NATIVE),
  maxResponseToken: z.number().default(1000),
  stream: z.boolean().default(false),
  onStreamFlowId: z.string().optional(),
  _version: z.number().optional(),
});
export type LLMRequestNodeData = z.infer<typeof LLMRequestNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies, signal, depth, executionPath, runId }) => {
  const data = LLMRequestNodeDataSchema.parse(node.data);
  const profileId = resolveInput(input, data, 'profileId');
  const maxResponseToken = resolveInput(input, data, 'maxResponseToken');
  const stream = resolveInput(input, data, 'stream');
  const onStreamFlowId = resolveInput(input, data, 'onStreamFlowId');
  const messages = resolveInput(input, data, 'messages');
  const schema = resolveInput(input, data, 'schema');

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
    let onStream: ((streamData: { chunk: string; fullText: string }) => void) | undefined;
    if (stream && onStreamFlowId) {
      onStream = async (streamData: { chunk: string; fullText: string }) => {
        try {
          await dependencies.executeSubFlow(onStreamFlowId, streamData, depth + 1, executionPath, runId);
        } catch (err) {
          console.error(`[Flowchart] Error in streaming sub-flow "${onStreamFlowId}":`, err);
          const flowName =
            settingsManager.getSettings().flows.find((f) => f.id === onStreamFlowId)?.name ?? onStreamFlowId;
          const errorMessage = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
          notify('error', `Streaming sub-flow "${flowName}" failed: ${errorMessage}`, 'execution');
          throw err;
        }
      };
    }

    const result = await dependencies.makeSimpleRequest(profileId, messages, maxResponseToken, onStream, signal);
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
    const issues = combineValidators(
      createRequiredFieldValidator('profileId', 'Connection Profile is required.'),
      createRequiredConnectionValidator('messages', 'A "Messages" input is required.'),
    )(node, edges);

    if (node.data.stream && edges.some((edge) => edge.target === node.id && edge.targetHandle === 'schema')) {
      issues.push({
        message: 'Streaming is not supported for structured (schema-based) requests.',
        severity: 'error',
      });
    }

    if (
      node.data.stream &&
      !node.data.onStreamFlowId &&
      !edges.some((edge) => edge.target === node.id && edge.targetHandle === 'onStreamFlowId')
    ) {
      issues.push({
        fieldId: 'onStreamFlowId',
        message: 'An "On Stream" flow must be selected when streaming is enabled.',
        severity: 'error',
      });
    }

    return issues;
  },
  execute,
  getDynamicHandles: (node, allNodes: Node[], allEdges: Edge[]) => {
    const isSchemaConnected = allEdges.some((edge) => edge.target === node.id && edge.targetHandle === 'schema');
    const isStreaming = node.data.stream;

    const dynamicInputs: HandleSpec[] = [];
    if (isSchemaConnected) {
      dynamicInputs.push({ id: 'schemaName', type: FlowDataType.STRING });
      dynamicInputs.push({ id: 'promptEngineeringMode', type: FlowDataType.STRING });
    }
    if (!isSchemaConnected) {
      dynamicInputs.push({ id: 'stream', type: FlowDataType.BOOLEAN });
      if (isStreaming) {
        dynamicInputs.push({ id: 'onStreamFlowId', type: FlowDataType.FLOW_ID });
      }
    }

    if (!isSchemaConnected) {
      return { inputs: dynamicInputs, outputs: [{ id: 'result', type: FlowDataType.STRING }] };
    }

    const schema = resolveSchemaFromHandle(node, allNodes, allEdges, 'schema');
    if (!schema) {
      return { inputs: dynamicInputs, outputs: [{ id: 'result', type: FlowDataType.ANY }] };
    }

    const resultHandle = { id: 'result', type: FlowDataType.STRUCTURED_RESULT, schema };
    const propertyHandles = createDynamicOutputHandlesForSchema(schema);

    return { inputs: dynamicInputs, outputs: [resultHandle, ...propertyHandles] };
  },
  getSuggestionBlueprints: ({ direction }) => {
    if (direction === 'inputs') {
      return [
        {
          id: 'streaming',
          labelSuffix: '(Streaming)',
          dataOverrides: { stream: true },
        },
      ];
    }
    return [];
  },
  getHandleType: ({ handleId, handleDirection, node, nodes, edges }) => {
    if (handleDirection !== 'output') return undefined;

    const schema = resolveSchemaFromHandle(node, nodes, edges, 'schema');
    if (!schema) {
      return handleId === 'result' ? FlowDataType.STRING : undefined;
    }
    if (handleId === 'result') return FlowDataType.STRUCTURED_RESULT;

    if (schema instanceof z.ZodObject && handleId && schema.shape[handleId]) {
      return zodTypeToFlowType(schema.shape[handleId]);
    }

    return undefined;
  },
};

registrator.register(llmRequestNodeDefinition);

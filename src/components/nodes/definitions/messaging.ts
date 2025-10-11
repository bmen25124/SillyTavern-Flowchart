import {
  CreateMessagesNodeData,
  CreateMessagesNodeDataSchema,
  CustomMessageNodeData,
  CustomMessageNodeDataSchema,
  FlowDataType,
  MergeMessagesNodeData,
  MergeMessagesNodeDataSchema,
  StructuredRequestNodeData,
  StructuredRequestNodeDataSchema,
} from '../../../flow-types.js';
import { CreateMessagesNode } from '../CreateMessagesNode.js';
import { CustomMessageNode } from '../CustomMessageNode.js';
import { MergeMessagesNode } from '../MergeMessagesNode.js';
import { StructuredRequestNode } from '../StructuredRequestNode.js';
import { NodeDefinition } from './types.js';
import { PromptEngineeringMode } from '../../../config.js';

export const createMessagesNodeDefinition: NodeDefinition<CreateMessagesNodeData> = {
  type: 'createMessagesNode',
  label: 'Create Messages',
  category: 'Messaging',
  component: CreateMessagesNode,
  dataSchema: CreateMessagesNodeDataSchema,
  initialData: { profileId: '' },
  handles: {
    inputs: [
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
      { id: 'lastMessageId', type: FlowDataType.NUMBER },
    ],
    outputs: [{ id: null, type: FlowDataType.MESSAGES }],
  },
};

export const customMessageNodeDefinition: NodeDefinition<CustomMessageNodeData> = {
  type: 'customMessageNode',
  label: 'Custom Message',
  category: 'Messaging',
  component: CustomMessageNode,
  dataSchema: CustomMessageNodeDataSchema,
  initialData: { messages: [{ id: crypto.randomUUID(), role: 'system', content: 'You are a helpful assistant.' }] },
  handles: {
    inputs: [], // Dynamic handles
    outputs: [{ id: null, type: FlowDataType.MESSAGES }],
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'input') {
      // Any handleId corresponding to a message ID is a string input for content
      if ((node.data as CustomMessageNodeData).messages.some((m) => m.id === handleId)) {
        return FlowDataType.STRING;
      }
    }
    return undefined;
  },
};

export const mergeMessagesNodeDefinition: NodeDefinition<MergeMessagesNodeData> = {
  type: 'mergeMessagesNode',
  label: 'Merge Messages',
  category: 'Messaging',
  component: MergeMessagesNode,
  dataSchema: MergeMessagesNodeDataSchema,
  initialData: { inputCount: 2 },
  handles: {
    inputs: [], // Dynamic handles
    outputs: [{ id: null, type: FlowDataType.MESSAGES }],
  },
  getHandleType: ({ handleId, handleDirection }) => {
    if (handleDirection === 'input' && handleId?.startsWith('messages_')) {
      return FlowDataType.MESSAGES;
    }
    return undefined;
  },
};

export const structuredRequestNodeDefinition: NodeDefinition<StructuredRequestNodeData> = {
  type: 'structuredRequestNode',
  label: 'Structured Request',
  category: 'Messaging',
  component: StructuredRequestNode,
  dataSchema: StructuredRequestNodeDataSchema,
  initialData: {
    profileId: '',
    schemaName: 'mySchema',
    promptEngineeringMode: PromptEngineeringMode.NATIVE,
    maxResponseToken: 1000,
  },
  handles: {
    inputs: [
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
      { id: 'messages', type: FlowDataType.MESSAGES },
      { id: 'schema', type: FlowDataType.SCHEMA },
      { id: 'maxResponseToken', type: FlowDataType.NUMBER },
    ],
    outputs: [{ id: 'result', type: FlowDataType.STRUCTURED_RESULT }], // Dynamic handles for fields
  },
  getHandleType: ({ handleId, handleDirection, node, nodes, edges }) => {
    if (handleDirection === 'output') {
      if (handleId === 'result') return FlowDataType.STRUCTURED_RESULT;

      const schemaEdge = edges.find((edge) => edge.target === node.id && edge.targetHandle === 'schema');
      if (!schemaEdge) return FlowDataType.ANY; // Cannot determine type without schema

      const schemaNode = nodes.find((node) => node.id === schemaEdge.source);
      if (schemaNode?.type !== 'schemaNode' || !Array.isArray(schemaNode.data.fields)) {
        return FlowDataType.ANY;
      }

      const field = schemaNode.data.fields.find((f: any) => f.name === handleId);
      if (!field) return undefined; // Invalid handle

      switch (field.type) {
        case 'string':
          return FlowDataType.STRING;
        case 'number':
          return FlowDataType.NUMBER;
        case 'boolean':
          return FlowDataType.BOOLEAN;
        default:
          return FlowDataType.OBJECT; // object, array, enum
      }
    }
    return undefined; // Let static lookup handle inputs
  },
};

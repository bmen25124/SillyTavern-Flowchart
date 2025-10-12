import {
  CreateMessagesNodeData,
  CreateMessagesNodeDataSchema,
  CustomMessageNodeData,
  CustomMessageNodeDataSchema,
  EditChatMessageNodeData,
  EditChatMessageNodeDataSchema,
  FlowDataType,
  GetChatMessageNodeData,
  GetChatMessageNodeDataSchema,
  MergeMessagesNodeData,
  MergeMessagesNodeDataSchema,
  RemoveChatMessageNodeData,
  RemoveChatMessageNodeDataSchema,
  SendChatMessageNodeData,
  SendChatMessageNodeDataSchema,
  StructuredRequestNodeData,
  StructuredRequestNodeDataSchema,
} from '../../../flow-types.js';
import { CreateMessagesNode } from '../CreateMessagesNode.js';
import { CustomMessageNode } from '../CustomMessageNode.js';
import { EditChatMessageNode } from '../EditChatMessageNode.js';
import { GetChatMessageNode } from '../GetChatMessageNode.js';
import { MergeMessagesNode } from '../MergeMessagesNode.js';
import { RemoveChatMessageNode } from '../RemoveChatMessageNode.js';
import { SendChatMessageNode } from '../SendChatMessageNode.js';
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

export const getChatMessageNodeDefinition: NodeDefinition<GetChatMessageNodeData> = {
  type: 'getChatMessageNode',
  label: 'Get Chat Message',
  category: 'Messaging',
  component: GetChatMessageNode,
  dataSchema: GetChatMessageNodeDataSchema,
  initialData: { messageId: 'last' },
  handles: {
    inputs: [{ id: 'messageId', type: FlowDataType.ANY }],
    outputs: [
      { id: 'id', type: FlowDataType.NUMBER },
      { id: 'result', type: FlowDataType.OBJECT },
      { id: 'name', type: FlowDataType.STRING },
      { id: 'mes', type: FlowDataType.STRING },
      { id: 'is_user', type: FlowDataType.BOOLEAN },
      { id: 'is_system', type: FlowDataType.BOOLEAN },
    ],
  },
};

export const editChatMessageNodeDefinition: NodeDefinition<EditChatMessageNodeData> = {
  type: 'editChatMessageNode',
  label: 'Edit Chat Message',
  category: 'Messaging',
  component: EditChatMessageNode,
  dataSchema: EditChatMessageNodeDataSchema,
  initialData: {},
  handles: {
    inputs: [
      { id: 'messageId', type: FlowDataType.NUMBER },
      { id: 'message', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'messageObject', type: FlowDataType.OBJECT }],
  },
};

export const sendChatMessageNodeDefinition: NodeDefinition<SendChatMessageNodeData> = {
  type: 'sendChatMessageNode',
  label: 'Send Chat Message',
  category: 'Messaging',
  component: SendChatMessageNode,
  dataSchema: SendChatMessageNodeDataSchema,
  initialData: { message: '', role: 'assistant' },
  handles: {
    inputs: [
      { id: 'message', type: FlowDataType.STRING },
      { id: 'role', type: FlowDataType.STRING },
      { id: 'name', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'messageId', type: FlowDataType.NUMBER }],
  },
};

export const removeChatMessageNodeDefinition: NodeDefinition<RemoveChatMessageNodeData> = {
  type: 'removeChatMessageNode',
  label: 'Remove Chat Message',
  category: 'Messaging',
  component: RemoveChatMessageNode,
  dataSchema: RemoveChatMessageNodeDataSchema,
  initialData: {},
  handles: {
    inputs: [{ id: 'messageId', type: FlowDataType.NUMBER }],
    outputs: [],
  },
};

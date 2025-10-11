import {
  CreateMessagesNodeData,
  CreateMessagesNodeDataSchema,
  CustomMessageNodeData,
  CustomMessageNodeDataSchema,
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
import { FlowDataType } from '../../../flow-types.js';
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
};

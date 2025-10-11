import {
  NumberNodeData,
  NumberNodeDataSchema,
  ProfileIdNodeData,
  ProfileIdNodeDataSchema,
  StringNodeData,
  StringNodeDataSchema,
} from '../../../flow-types.js';
import { NumberNode } from '../NumberNode.js';
import { ProfileIdNode } from '../ProfileIdNode.js';
import { StringNode } from '../StringNode.js';
import { NodeDefinition } from './types.js';
import { FlowDataType } from '../../../flow-types.js';

export const stringNodeDefinition: NodeDefinition<StringNodeData> = {
  type: 'stringNode',
  label: 'String',
  category: 'Input',
  component: StringNode,
  dataSchema: StringNodeDataSchema,
  initialData: { value: 'hello' },
  handles: {
    inputs: [{ id: 'value', type: FlowDataType.ANY }],
    outputs: [{ id: 'value', type: FlowDataType.STRING }],
  },
};

export const numberNodeDefinition: NodeDefinition<NumberNodeData> = {
  type: 'numberNode',
  label: 'Number',
  category: 'Input',
  component: NumberNode,
  dataSchema: NumberNodeDataSchema,
  initialData: { value: 123 },
  handles: {
    inputs: [{ id: 'value', type: FlowDataType.ANY }],
    outputs: [{ id: 'value', type: FlowDataType.NUMBER }],
  },
};

export const profileIdNodeDefinition: NodeDefinition<ProfileIdNodeData> = {
  type: 'profileIdNode',
  label: 'Profile ID',
  category: 'Input',
  component: ProfileIdNode,
  dataSchema: ProfileIdNodeDataSchema,
  initialData: { profileId: '' },
  handles: {
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.PROFILE_ID }],
  },
};

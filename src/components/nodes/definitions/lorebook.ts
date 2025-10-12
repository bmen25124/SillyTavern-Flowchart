import {
  CreateLorebookEntryNodeData,
  CreateLorebookEntryNodeDataSchema,
  CreateLorebookNodeData,
  CreateLorebookNodeDataSchema,
  EditLorebookEntryNodeData,
  EditLorebookEntryNodeDataSchema,
  GetLorebookEntryNodeData,
  GetLorebookEntryNodeDataSchema,
  GetLorebookNodeData,
  GetLorebookNodeDataSchema,
} from '../../../flow-types.js';
import { CreateLorebookEntryNode } from '../CreateLorebookEntryNode.js';
import { CreateLorebookNode } from '../CreateLorebookNode.js';
import { EditLorebookEntryNode } from '../EditLorebookEntryNode.js';
import { GetLorebookEntryNode } from '../GetLorebookEntryNode.js';
import { GetLorebookNode } from '../GetLorebookNode.js';
import { NodeDefinition } from './types.js';
import { FlowDataType } from '../../../flow-types.js';

export const createLorebookNodeDefinition: NodeDefinition<CreateLorebookNodeData> = {
  type: 'createLorebookNode',
  label: 'Create Lorebook',
  category: 'Lorebook',
  component: CreateLorebookNode,
  dataSchema: CreateLorebookNodeDataSchema,
  initialData: { worldName: 'My Lorebook' },
  handles: {
    inputs: [{ id: 'worldName', type: FlowDataType.STRING }],
    outputs: [{ id: null, type: FlowDataType.STRING }],
  },
};

export const createLorebookEntryNodeDefinition: NodeDefinition<CreateLorebookEntryNodeData> = {
  type: 'createLorebookEntryNode',
  label: 'Create Lorebook Entry',
  category: 'Lorebook',
  component: CreateLorebookEntryNode,
  dataSchema: CreateLorebookEntryNodeDataSchema,
  initialData: { worldName: '', key: '', content: '', comment: '' },
  handles: {
    inputs: [
      { id: 'worldName', type: FlowDataType.STRING },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
    ],
    outputs: [{ id: null, type: FlowDataType.OBJECT }],
  },
};

export const editLorebookEntryNodeDefinition: NodeDefinition<EditLorebookEntryNodeData> = {
  type: 'editLorebookEntryNode',
  label: 'Edit Lorebook Entry',
  category: 'Lorebook',
  component: EditLorebookEntryNode,
  dataSchema: EditLorebookEntryNodeDataSchema,
  initialData: { worldName: '', entryUid: undefined },
  handles: {
    inputs: [
      { id: 'worldName', type: FlowDataType.STRING },
      { id: 'entryUid', type: FlowDataType.NUMBER },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
    ],
    outputs: [{ id: null, type: FlowDataType.OBJECT }],
  },
};

export const getLorebookNodeDefinition: NodeDefinition<GetLorebookNodeData> = {
  type: 'getLorebookNode',
  label: 'Get Lorebook',
  category: 'Lorebook',
  component: GetLorebookNode,
  dataSchema: GetLorebookNodeDataSchema,
  initialData: { worldName: '' },
  handles: {
    inputs: [{ id: 'worldName', type: FlowDataType.STRING }],
    outputs: [{ id: 'entries', type: FlowDataType.OBJECT }], // It's an array of objects
  },
};

export const getLorebookEntryNodeDefinition: NodeDefinition<GetLorebookEntryNodeData> = {
  type: 'getLorebookEntryNode',
  label: 'Get Lorebook Entry',
  category: 'Lorebook',
  component: GetLorebookEntryNode,
  dataSchema: GetLorebookEntryNodeDataSchema,
  initialData: { worldName: '', entryUid: undefined },
  handles: {
    inputs: [
      { id: 'worldName', type: FlowDataType.STRING },
      { id: 'entryUid', type: FlowDataType.NUMBER },
    ],
    outputs: [
      { id: 'entry', type: FlowDataType.OBJECT },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
    ],
  },
};

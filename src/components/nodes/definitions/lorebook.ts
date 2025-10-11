import {
  CreateLorebookEntryNodeData,
  CreateLorebookEntryNodeDataSchema,
  CreateLorebookNodeData,
  CreateLorebookNodeDataSchema,
  EditLorebookEntryNodeData,
  EditLorebookEntryNodeDataSchema,
} from '../../../flow-types.js';
import { CreateLorebookEntryNode } from '../CreateLorebookEntryNode.js';
import { CreateLorebookNode } from '../CreateLorebookNode.js';
import { EditLorebookEntryNode } from '../EditLorebookEntryNode.js';
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

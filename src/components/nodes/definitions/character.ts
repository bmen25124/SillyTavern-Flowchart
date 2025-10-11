import {
  CreateCharacterNodeData,
  CreateCharacterNodeDataSchema,
  EditCharacterNodeData,
  EditCharacterNodeDataSchema,
  GetCharacterNodeData,
  GetCharacterNodeDataSchema,
} from '../../../flow-types.js';
import { CreateCharacterNode } from '../CreateCharacterNode.js';
import { EditCharacterNode } from '../EditCharacterNode.js';
import { GetCharacterNode } from '../GetCharacterNode.js';
import { NodeDefinition } from './types.js';
import { FlowDataType } from '../../../flow-types.js';

export const getCharacterNodeDefinition: NodeDefinition<GetCharacterNodeData> = {
  type: 'getCharacterNode',
  label: 'Get Character',
  category: 'Character',
  component: GetCharacterNode,
  dataSchema: GetCharacterNodeDataSchema,
  initialData: { characterAvatar: '' },
  handles: {
    inputs: [{ id: 'characterAvatar', type: FlowDataType.STRING }],
    outputs: [
      { id: 'result', type: FlowDataType.OBJECT },
      { id: 'name', type: FlowDataType.STRING },
      { id: 'description', type: FlowDataType.STRING },
      { id: 'first_mes', type: FlowDataType.STRING },
      { id: 'scenario', type: FlowDataType.STRING },
      { id: 'personality', type: FlowDataType.STRING },
      { id: 'mes_example', type: FlowDataType.STRING },
      { id: 'tags', type: FlowDataType.OBJECT }, // It's a string[]
    ],
  },
};

export const createCharacterNodeDefinition: NodeDefinition<CreateCharacterNodeData> = {
  type: 'createCharacterNode',
  label: 'Create Character',
  category: 'Character',
  component: CreateCharacterNode,
  dataSchema: CreateCharacterNodeDataSchema,
  initialData: { name: 'New Character' },
  handles: {
    inputs: [
      { id: 'name', type: FlowDataType.STRING },
      { id: 'description', type: FlowDataType.STRING },
      { id: 'first_mes', type: FlowDataType.STRING },
      { id: 'scenario', type: FlowDataType.STRING },
      { id: 'personality', type: FlowDataType.STRING },
      { id: 'mes_example', type: FlowDataType.STRING },
      { id: 'tags', type: FlowDataType.STRING },
    ],
    outputs: [{ id: null, type: FlowDataType.STRING }], // Output character name
  },
};

export const editCharacterNodeDefinition: NodeDefinition<EditCharacterNodeData> = {
  type: 'editCharacterNode',
  label: 'Edit Character',
  category: 'Character',
  component: EditCharacterNode,
  dataSchema: EditCharacterNodeDataSchema,
  initialData: { characterAvatar: '' },
  handles: {
    inputs: [
      { id: 'characterAvatar', type: FlowDataType.STRING },
      { id: 'name', type: FlowDataType.STRING },
      { id: 'description', type: FlowDataType.STRING },
      { id: 'first_mes', type: FlowDataType.STRING },
      { id: 'scenario', type: FlowDataType.STRING },
      { id: 'personality', type: FlowDataType.STRING },
      { id: 'mes_example', type: FlowDataType.STRING },
      { id: 'tags', type: FlowDataType.STRING },
    ],
    outputs: [{ id: null, type: FlowDataType.STRING }], // Output character name
  },
};

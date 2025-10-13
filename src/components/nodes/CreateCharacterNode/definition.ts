import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, CreateCharacterNodeDataSchema } from '../../../flow-types.js';
import { CreateCharacterNode } from './CreateCharacterNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { FullExportData } from 'sillytavern-utils-lib/types';

const resolveInput = <T extends object, K extends keyof T>(input: Record<string, any>, staticData: T, key: K): T[K] =>
  input[key as string] ?? staticData[key];

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = CreateCharacterNodeDataSchema.parse(node.data);
  const name = resolveInput(input, data, 'name');
  if (!name) throw new Error(`Character name is required.`);

  const tagsStr = resolveInput(input, data, 'tags') ?? '';
  const charData: FullExportData = {
    name,
    description: resolveInput(input, data, 'description') ?? '',
    first_mes: resolveInput(input, data, 'first_mes') ?? '',
    scenario: resolveInput(input, data, 'scenario') ?? '',
    personality: resolveInput(input, data, 'personality') ?? '',
    mes_example: resolveInput(input, data, 'mes_example') ?? '',
    tags: tagsStr
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean),
    avatar: 'none',
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {} as any, // ST internally fills this
  };

  await dependencies.createCharacter(charData);
  return name;
};

export const createCharacterNodeDefinition: NodeDefinition = {
  type: 'createCharacterNode',
  label: 'Create Character',
  category: 'Character',
  component: CreateCharacterNode,
  dataSchema: CreateCharacterNodeDataSchema,
  currentVersion: 1,
  initialData: { name: 'New Character', _version: 1 },
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
    outputs: [{ id: null, type: FlowDataType.STRING }],
  },
  execute,
};

registrator.register(createCharacterNodeDefinition);

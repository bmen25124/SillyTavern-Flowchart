import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { GetCharacterNode } from './GetCharacterNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { Character } from 'sillytavern-utils-lib/types';
import { resolveInput } from '../../../utils/node-logic.js';

export const GetCharacterNodeDataSchema = z.object({
  characterAvatar: z.string().default(''),
  _version: z.number().optional(),
});
export type GetCharacterNodeData = z.infer<typeof GetCharacterNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = GetCharacterNodeDataSchema.parse(node.data);
  const characterAvatar = resolveInput(input, data, 'characterAvatar');
  if (!characterAvatar) throw new Error('No character avatar provided.');

  const stContext = dependencies.getSillyTavernContext();
  let character = stContext.characters.find((c: Character) => c.avatar === characterAvatar);
  if (!character) throw new Error(`Character with avatar ${characterAvatar} not found.`);
  character = structuredClone(character);
  delete (character as any)?.data?.json_data;
  delete (character as any)?.json_data;

  return { ...character, result: character };
};

const CharacterDataSchema = z.object({
  name: z.string().describe("The character's name."),
  avatar: z.string().describe("The character's avatar filename."),
  description: z.string().describe("The character's description."),
  first_mes: z.string().describe("The character's first message."),
  scenario: z.string().describe('The scenario.'),
  personality: z.string().describe("The character's personality."),
  mes_example: z.string().describe('Example messages.'),
  tags: z.array(z.string()).describe('A list of tags.'),
});

export const getCharacterNodeDefinition: NodeDefinition<GetCharacterNodeData> = {
  type: 'getCharacterNode',
  label: 'Get Character',
  category: 'Character',
  component: GetCharacterNode,
  dataSchema: GetCharacterNodeDataSchema,
  currentVersion: 1,
  initialData: { characterAvatar: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'characterAvatar', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.OBJECT, schema: CharacterDataSchema },
      { id: 'name', type: FlowDataType.STRING },
      { id: 'description', type: FlowDataType.STRING },
      { id: 'first_mes', type: FlowDataType.STRING },
      { id: 'scenario', type: FlowDataType.STRING },
      { id: 'personality', type: FlowDataType.STRING },
      { id: 'mes_example', type: FlowDataType.STRING },
      { id: 'tags', type: FlowDataType.OBJECT, schema: z.array(z.string()) },
    ],
  },
  validate: (node: Node<GetCharacterNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const isConnected = edges.some((edge) => edge.target === node.id && edge.targetHandle === 'characterAvatar');
    if (!node.data.characterAvatar && !isConnected) {
      issues.push({ fieldId: 'characterAvatar', message: 'Character is required.', severity: 'error' });
    }
    return issues;
  },
  execute,
};

registrator.register(getCharacterNodeDefinition);

import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { GetCharacterNode } from './GetCharacterNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { Character } from 'sillytavern-utils-lib/types';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';

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
  delete character.data?.json_data;
  delete character.json_data;

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
      { id: 'characterAvatar', type: FlowDataType.CHARACTER_AVATAR },
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
      { id: 'tags', type: FlowDataType.ARRAY, schema: z.array(z.string()) },
    ],
  },
  validate: combineValidators(createRequiredFieldValidator('characterAvatar', 'Character is required.')),
  execute,
};

registrator.register(getCharacterNodeDefinition);

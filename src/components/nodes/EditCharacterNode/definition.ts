import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { EditCharacterNode } from './EditCharacterNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { Character } from 'sillytavern-utils-lib/types';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';

const CharacterFieldsSchema = {
  name: z.string().optional(),
  description: z.string().optional(),
  first_mes: z.string().optional(),
  scenario: z.string().optional(),
  personality: z.string().optional(),
  mes_example: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
};

export const EditCharacterNodeDataSchema = z.object({
  ...CharacterFieldsSchema,
  characterAvatar: z.string().default(''),
  _version: z.number().optional(),
});
export type EditCharacterNodeData = z.infer<typeof EditCharacterNodeDataSchema>;

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

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = EditCharacterNodeDataSchema.parse(node.data);
  const characterAvatar = resolveInput(input, data, 'characterAvatar');
  if (!characterAvatar) throw new Error(`Character avatar is required.`);

  const stContext = dependencies.getSillyTavernContext();
  let existingChar = stContext.characters.find((c: Character) => c.avatar === characterAvatar);
  if (!existingChar) throw new Error(`Character with avatar "${characterAvatar}" not found.`);

  const updatedChar = structuredClone(existingChar);
  delete updatedChar.json_data;
  delete updatedChar.data?.json_data;

  const fields: (keyof typeof data)[] = ['name', 'description', 'first_mes', 'scenario', 'personality', 'mes_example'];

  const characterPartial: Partial<Character> & { avatar: string } = { avatar: existingChar.avatar };

  let anyChanges = false;
  fields.forEach((field) => {
    const value = resolveInput(input, data, field);
    if (value) {
      (characterPartial as any)[field] = value;
      (updatedChar as any)[field] = value;
      if (!characterPartial.data) {
        characterPartial.data = {};
      }
      characterPartial.data[field] = value;
      anyChanges = true;
    }
  });

  const tagsStr = resolveInput(input, data, 'tags');
  if (tagsStr) {
    const newTags = tagsStr
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);
    characterPartial.tags = newTags;
    updatedChar.tags = newTags;
    anyChanges = true;
  }

  if (!anyChanges) throw new Error('No changes provided to update the character.');

  await dependencies.saveCharacter(characterPartial);

  if (characterPartial.data) {
    updatedChar.data = { ...existingChar.data, ...characterPartial.data };
  }

  return { ...updatedChar, result: updatedChar };
};

export const editCharacterNodeDefinition: NodeDefinition<EditCharacterNodeData> = {
  type: 'editCharacterNode',
  label: 'Edit Character',
  category: 'Character',
  component: EditCharacterNode,
  dataSchema: EditCharacterNodeDataSchema,
  currentVersion: 2,
  initialData: { characterAvatar: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'characterAvatar', type: FlowDataType.CHARACTER_AVATAR },
      { id: 'name', type: FlowDataType.STRING },
      { id: 'description', type: FlowDataType.STRING },
      { id: 'first_mes', type: FlowDataType.STRING },
      { id: 'scenario', type: FlowDataType.STRING },
      { id: 'personality', type: FlowDataType.STRING },
      { id: 'mes_example', type: FlowDataType.STRING },
      { id: 'tags', type: FlowDataType.STRING },
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
  validate: combineValidators(createRequiredFieldValidator('characterAvatar', 'Character to Edit is required.')),
  execute,
};

registrator.register(editCharacterNodeDefinition);

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
  description: z.string().optional(),
  first_mes: z.string().optional(),
  scenario: z.string().optional(),
  personality: z.string().optional(),
  mes_example: z.string().optional(),
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
  const existingChar = stContext.characters.find((c: Character) => c.avatar === characterAvatar);
  if (!existingChar) throw new Error(`Character with avatar "${characterAvatar}" not found.`);

  const characterPartial: Partial<Character> & { avatar: string; data?: any } = { avatar: existingChar.avatar };
  let anyChanges = false;

  const fields: (keyof typeof CharacterFieldsSchema)[] = [
    'description',
    'first_mes',
    'scenario',
    'personality',
    'mes_example',
  ];

  fields.forEach((field) => {
    const value = resolveInput(input, data, field);
    const isConnected = input[field] !== undefined;

    if (isConnected || (value && value.trim() !== '')) {
      (characterPartial as any)[field] = value;
      anyChanges = true;
    }
  });

  if (!anyChanges) {
    const unmodifiedChar = structuredClone(existingChar);
    delete unmodifiedChar.json_data;
    delete unmodifiedChar.data?.json_data;
    return { ...unmodifiedChar, result: unmodifiedChar };
  }

  await dependencies.saveCharacter(characterPartial);

  const updatedChar = { ...structuredClone(existingChar), ...characterPartial };
  delete updatedChar.json_data;
  if (updatedChar.data) delete updatedChar.data.json_data;

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
      { id: 'description', type: FlowDataType.STRING },
      { id: 'first_mes', type: FlowDataType.STRING },
      { id: 'scenario', type: FlowDataType.STRING },
      { id: 'personality', type: FlowDataType.STRING },
      { id: 'mes_example', type: FlowDataType.STRING },
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

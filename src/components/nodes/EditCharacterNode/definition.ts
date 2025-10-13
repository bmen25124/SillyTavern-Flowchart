import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, EditCharacterNodeDataSchema } from '../../../flow-types.js';
import { EditCharacterNode } from './EditCharacterNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { Character } from 'sillytavern-utils-lib/types';
import { resolveInput } from '../../../utils/node-logic.js';

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = EditCharacterNodeDataSchema.parse(node.data);
  const characterAvatar = resolveInput(input, data, 'characterAvatar');
  if (!characterAvatar) throw new Error(`Character avatar is required.`);

  const stContext = dependencies.getSillyTavernContext();
  let existingChar = stContext.characters.find((c: Character) => c.avatar === characterAvatar);
  if (!existingChar) throw new Error(`Character with avatar "${characterAvatar}" not found.`);
  existingChar = structuredClone(existingChar);

  const fields: (keyof typeof data)[] = ['name', 'description', 'first_mes', 'scenario', 'personality', 'mes_example'];

  fields.forEach((field) => {
    const value = resolveInput(input, data, field);
    if (value) {
      (existingChar as any)[field] = value;
    }
  });

  const tagsStr = resolveInput(input, data, 'tags');
  if (tagsStr) {
    existingChar.tags = tagsStr
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);
  }

  await dependencies.saveCharacter(existingChar);
  return existingChar.name;
};

export const editCharacterNodeDefinition: NodeDefinition = {
  type: 'editCharacterNode',
  label: 'Edit Character',
  category: 'Character',
  component: EditCharacterNode,
  dataSchema: EditCharacterNodeDataSchema,
  currentVersion: 1,
  initialData: { characterAvatar: '', _version: 1 },
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
    outputs: [{ id: null, type: FlowDataType.STRING }],
  },
  execute,
};

registrator.register(editCharacterNodeDefinition);

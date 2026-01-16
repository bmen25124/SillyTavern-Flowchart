import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { FullExportData } from 'sillytavern-utils-lib/types';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STInput, STTextarea } from 'sillytavern-utils-lib/components/react';

const CharacterFieldsSchema = {
  name: z.string().optional(),
  description: z.string().optional(),
  first_mes: z.string().optional(),
  scenario: z.string().optional(),
  personality: z.string().optional(),
  mes_example: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
};

export const CreateCharacterNodeDataSchema = z.object({
  ...CharacterFieldsSchema,
  _version: z.number().optional(),
});
export type CreateCharacterNodeData = z.infer<typeof CreateCharacterNodeDataSchema>;

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
    data: {} as any,
  };

  await dependencies.createCharacter(charData);
  return { result: name };
};

export const createCharacterNodeDefinition: NodeDefinition<CreateCharacterNodeData> = {
  type: 'createCharacterNode',
  label: 'Create Character',
  category: 'Character',
  component: DataDrivenNode,
  dataSchema: CreateCharacterNodeDataSchema,
  currentVersion: 1,
  initialData: { name: 'New Character' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
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
      { id: 'result', type: FlowDataType.STRING },
    ],
  },
  validate: combineValidators(createRequiredFieldValidator('name', 'Name is required.')),
  execute,
  meta: {
    fields: [
      createFieldConfig({ id: 'name', label: 'Name', component: STInput, props: { type: 'text' } }),
      createFieldConfig({ id: 'description', label: 'Description', component: STTextarea, props: { rows: 2 } }),
      createFieldConfig({ id: 'first_mes', label: 'First Message', component: STTextarea, props: { rows: 2 } }),
      createFieldConfig({ id: 'scenario', label: 'Scenario', component: STTextarea, props: { rows: 2 } }),
      createFieldConfig({ id: 'personality', label: 'Personality', component: STTextarea, props: { rows: 2 } }),
      createFieldConfig({ id: 'mes_example', label: 'Message Examples', component: STTextarea, props: { rows: 2 } }),
      createFieldConfig({ id: 'tags', label: 'Tags (comma-separated)', component: STInput, props: { type: 'text' } }),
    ],
  },
};

registrator.register(createCharacterNodeDefinition);

import { z } from 'zod';
import React from 'react';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { WIEntrySchema } from '../../../schemas.js';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STFancyDropdown, STInput, STSelect, STTextarea } from 'sillytavern-utils-lib/components/react';
import { getWorldInfos } from 'sillytavern-utils-lib';
import { AsyncDataDrivenNode } from '../AsyncDataDrivenNode.js';

export const CreateLorebookEntryNodeDataSchema = z.object({
  worldName: z.string().optional(),
  key: z.string().optional(), // comma-separated
  content: z.string().optional(),
  comment: z.string().optional(),
  disable: z.boolean().optional(),
  _version: z.number().optional(),
});
export type CreateLorebookEntryNodeData = z.infer<typeof CreateLorebookEntryNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = CreateLorebookEntryNodeDataSchema.parse(node.data);
  const worldName = resolveInput(input, data, 'worldName');
  const keys = resolveInput(input, data, 'key') ?? '';
  if (!worldName) throw new Error('World name is required.');
  if (!keys) throw new Error('Key(s) are required.');

  const newEntry: WIEntry = {
    uid: -1, // SillyTavern will assign a new UID
    key: keys.split(',').map((k: string) => k.trim()),
    content: resolveInput(input, data, 'content') ?? '',
    comment: resolveInput(input, data, 'comment') ?? '',
    disable: resolveInput(input, data, 'disable') ?? false,
    keysecondary: [],
  };

  const result = await dependencies.applyWorldInfoEntry({
    entry: newEntry,
    selectedWorldName: worldName,
    operation: 'add',
  });
  return { result: result.entry };
};

export const createLorebookEntryNodeDefinition: NodeDefinition<CreateLorebookEntryNodeData> = {
  type: 'createLorebookEntryNode',
  label: 'Create Lorebook Entry',
  category: 'Lorebook',
  component: AsyncDataDrivenNode,
  dataSchema: CreateLorebookEntryNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: '', key: '', content: '', comment: '', disable: false },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'worldName', type: FlowDataType.LOREBOOK_NAME },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
      { id: 'disable', type: FlowDataType.BOOLEAN },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.OBJECT, schema: WIEntrySchema },
    ],
  },
  validate: combineValidators(
    createRequiredFieldValidator('worldName', 'Lorebook Name is required.'),
    createRequiredFieldValidator('key', 'Keys are required.'),
  ),
  execute,
  meta: {
    fields: async () => {
      const worlds = await getWorldInfos(['all']);
      const lorebookOptions = Object.keys(worlds).map((name) => ({ value: name, label: name }));

      return [
        createFieldConfig({
          id: 'worldName',
          label: 'Lorebook Name',
          component: STFancyDropdown,
          props: {
            items: lorebookOptions,
            multiple: false,
            inputClasses: 'nodrag',
            containerClasses: 'nodrag nowheel',
            closeOnSelect: true,
            enableSearch: true,
          },
          getValueFromEvent: (e: string[]) => e[0],
          formatValue: (value: string) => [value ?? ''],
        }),
        createFieldConfig({ id: 'key', label: 'Keys (comma-separated)', component: STInput, props: { type: 'text' } }),
        createFieldConfig({ id: 'comment', label: 'Comment (Title)', component: STInput, props: { type: 'text' } }),
        createFieldConfig({ id: 'content', label: 'Content', component: STTextarea, props: { rows: 2 } }),
        createFieldConfig({
          id: 'disable',
          label: 'Status',
          component: STSelect,
          options: [
            { value: 'false', label: 'Enabled' },
            { value: 'true', label: 'Disabled' },
          ],
          getValueFromEvent: (e: React.ChangeEvent<HTMLSelectElement>) => e.target.value === 'true',
          formatValue: (value: boolean) => String(value ?? false),
        }),
      ];
    },
  },
};

registrator.register(createLorebookEntryNodeDefinition);

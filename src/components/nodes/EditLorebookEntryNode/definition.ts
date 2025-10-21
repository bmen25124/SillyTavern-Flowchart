import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { WIEntrySchema } from '../../../schemas.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STFancyDropdown, STInput, STTextarea } from 'sillytavern-utils-lib/components';
import { getWorldInfos } from 'sillytavern-utils-lib';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import { AsyncDataDrivenNode } from '../AsyncDataDrivenNode.js';

export const EditLorebookEntryNodeDataSchema = z.object({
  worldName: z.string().optional(),
  entryUid: z.number().optional(),
  key: z.string().optional(),
  content: z.string().optional(),
  comment: z.string().optional(),
  _version: z.number().optional(),
});
export type EditLorebookEntryNodeData = z.infer<typeof EditLorebookEntryNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = EditLorebookEntryNodeDataSchema.parse(node.data);
  const worldName = resolveInput(input, data, 'worldName');
  const entryUid = resolveInput(input, data, 'entryUid');
  if (!worldName) throw new Error('World name is required to find the entry.');
  if (entryUid === undefined) throw new Error('Entry UID is required to identify the entry to edit.');

  const allWorlds = await dependencies.getWorldInfos(['all']);
  const world = allWorlds[worldName];
  if (!world) throw new Error(`Lorebook "${worldName}" not found.`);

  const entryToEdit = world.find((entry) => entry.uid === entryUid);
  if (!entryToEdit) throw new Error(`Entry with UID "${entryUid}" not found in "${worldName}".`);

  let anyChanges = false;

  const fields: ('key' | 'content' | 'comment')[] = ['key', 'content', 'comment'];

  fields.forEach((field) => {
    const value = resolveInput(input, data, field);
    const isConnected = input[field] !== undefined;

    if (isConnected) {
      if (field === 'key') {
        entryToEdit.key = String(value)
          .split(',')
          .map((k: string) => k.trim());
      } else {
        entryToEdit[field] = String(value);
      }
      anyChanges = true;
    } else if (value) {
      // Only for non-empty static values
      if (field === 'key') {
        entryToEdit.key = value.split(',').map((k: string) => k.trim());
      } else {
        (entryToEdit as any)[field] = value;
      }
      anyChanges = true;
    }
  });

  if (!anyChanges) {
    return { result: structuredClone(entryToEdit) };
  }

  const result = await dependencies.applyWorldInfoEntry({
    entry: entryToEdit,
    selectedWorldName: worldName,
    operation: 'update',
  });
  return { result: result.entry };
};

export const editLorebookEntryNodeDefinition: NodeDefinition<EditLorebookEntryNodeData> = {
  type: 'editLorebookEntryNode',
  label: 'Edit Lorebook Entry',
  category: 'Lorebook',
  component: AsyncDataDrivenNode,
  dataSchema: EditLorebookEntryNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: '', entryUid: undefined },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'worldName', type: FlowDataType.LOREBOOK_NAME },
      { id: 'entryUid', type: FlowDataType.NUMBER },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.OBJECT, schema: WIEntrySchema },
    ],
  },
  validate: combineValidators(
    createRequiredFieldValidator('worldName', 'Lorebook Name is required.'),
    createRequiredFieldValidator('entryUid', 'Entry to Edit is required.'),
  ),
  execute,
  meta: {
    fields: async (data: EditLorebookEntryNodeData) => {
      const allWorldsData: Record<string, WIEntry[]> = await getWorldInfos(['all']);
      const lorebookOptions = Object.keys(allWorldsData).map((name) => ({ value: name, label: name }));
      const entryOptions =
        !data?.worldName || !allWorldsData[data.worldName]
          ? []
          : allWorldsData[data.worldName].map((entry) => ({
              value: String(entry.uid),
              label: entry.comment || `Entry UID: ${entry.uid}`,
            }));

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
          customChangeHandler: (e: string[], { nodeId, updateNodeData }) => {
            updateNodeData(nodeId, { worldName: e[0], entryUid: undefined });
          },
          formatValue: (value: string) => [value ?? ''],
        }),
        createFieldConfig({
          id: 'entryUid',
          label: 'Entry to Edit',
          component: STFancyDropdown,
          props: {
            items: entryOptions,
            multiple: false,
            inputClasses: 'nodrag',
            containerClasses: 'nodrag nowheel',
            closeOnSelect: true,
            enableSearch: true,
            disabled: !data?.worldName,
          },
          getValueFromEvent: (e: string[]) => Number(e[0]),
          formatValue: (value: number) => [String(value ?? '')],
        }),
        createFieldConfig({
          id: 'key',
          label: 'New Keys (comma-separated)',
          component: STInput,
          props: { type: 'text', placeholder: 'Leave blank to not change' },
        }),
        createFieldConfig({
          id: 'comment',
          label: 'New Comment (Title)',
          component: STInput,
          props: { type: 'text', placeholder: 'Leave blank to not change' },
        }),
        createFieldConfig({
          id: 'content',
          label: 'New Content',
          component: STTextarea,
          props: { rows: 2, placeholder: 'Leave blank to not change' },
        }),
      ];
    },
  },
};

registrator.register(editLorebookEntryNodeDefinition);

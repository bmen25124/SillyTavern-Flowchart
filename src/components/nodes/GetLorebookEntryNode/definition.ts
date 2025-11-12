import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { WIEntrySchema } from '../../../schemas.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { AsyncDataDrivenNode } from '../AsyncDataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components';
import { getWorldInfos } from 'sillytavern-utils-lib';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';

export const GetLorebookEntryNodeDataSchema = z.object({
  worldName: z.string().optional(),
  entryUid: z.number().optional(),
  _version: z.number().optional(),
});
export type GetLorebookEntryNodeData = z.infer<typeof GetLorebookEntryNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = GetLorebookEntryNodeDataSchema.parse(node.data);
  const worldName = resolveInput(input, data, 'worldName');
  const entryUid = resolveInput(input, data, 'entryUid');
  if (!worldName) throw new Error('World name is required.');
  if (entryUid === undefined) throw new Error('Entry UID is required.');

  const allWorlds = await dependencies.getWorldInfos(['all']);
  const world = allWorlds[worldName];
  if (!world) throw new Error(`Lorebook "${worldName}" not found.`);

  const entry = world.find((e) => e.uid === entryUid);
  if (!entry) throw new Error(`Entry with UID "${entryUid}" not found in "${worldName}".`);

  return {
    entry,
    key: entry.key.join(', '),
    content: entry.content,
    comment: entry.comment,
    disable: entry.disable,
  };
};

export const getLorebookEntryNodeDefinition: NodeDefinition<GetLorebookEntryNodeData> = {
  type: 'getLorebookEntryNode',
  label: 'Get Lorebook Entry',
  category: 'Lorebook',
  component: AsyncDataDrivenNode,
  dataSchema: GetLorebookEntryNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: '', entryUid: undefined },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'worldName', type: FlowDataType.LOREBOOK_NAME },
      { id: 'entryUid', type: FlowDataType.NUMBER },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'entry', type: FlowDataType.OBJECT, schema: WIEntrySchema },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
      { id: 'disable', type: FlowDataType.BOOLEAN },
    ],
  },
  validate: combineValidators(
    createRequiredFieldValidator('worldName', 'Lorebook Name is required.'),
    createRequiredFieldValidator('entryUid', 'Entry is required.'),
  ),
  execute,
  meta: {
    fields: async (data: GetLorebookEntryNodeData) => {
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
          label: 'Entry',
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
          formatValue: (value) => [String(value ?? '')],
        }),
      ];
    },
  },
};

registrator.register(getLorebookEntryNodeDefinition);

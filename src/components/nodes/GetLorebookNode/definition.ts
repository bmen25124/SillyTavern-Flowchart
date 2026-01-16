import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { WIEntryListSchema } from '../../../schemas.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { AsyncDataDrivenNode } from '../AsyncDataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STFancyDropdown } from 'sillytavern-utils-lib/components/react';
import { getWorldInfos } from 'sillytavern-utils-lib';

export const GetLorebookNodeDataSchema = z.object({
  worldName: z.string().optional(),
  _version: z.number().optional(),
});
export type GetLorebookNodeData = z.infer<typeof GetLorebookNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = GetLorebookNodeDataSchema.parse(node.data);
  const worldName = resolveInput(input, data, 'worldName');
  if (!worldName) throw new Error('World name is required.');

  const allWorlds = await dependencies.getWorldInfos(['all']);
  const world = allWorlds[worldName];
  if (!world) throw new Error(`Lorebook "${worldName}" not found.`);
  return { entries: world };
};

export const getLorebookNodeDefinition: NodeDefinition<GetLorebookNodeData> = {
  type: 'getLorebookNode',
  label: 'Get Lorebook',
  category: 'Lorebook',
  component: AsyncDataDrivenNode,
  dataSchema: GetLorebookNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'worldName', type: FlowDataType.LOREBOOK_NAME },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'entries', type: FlowDataType.ARRAY, schema: WIEntryListSchema },
    ],
  },
  validate: combineValidators(createRequiredFieldValidator('worldName', 'Lorebook Name is required.')),
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
      ];
    },
  },
};

registrator.register(getLorebookNodeDefinition);

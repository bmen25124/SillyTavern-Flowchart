import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STInput } from 'sillytavern-utils-lib/components/react';

export const CreateLorebookNodeDataSchema = z.object({
  worldName: z.string().optional(),
  _version: z.number().optional(),
});
export type CreateLorebookNodeData = z.infer<typeof CreateLorebookNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = CreateLorebookNodeDataSchema.parse(node.data);
  const worldName = resolveInput(input, data, 'worldName');
  if (!worldName) throw new Error(`World name is required.`);

  const success = await dependencies.st_createNewWorldInfo(worldName);
  if (!success) throw new Error(`Failed to create lorebook "${worldName}". It might already exist.`);
  return { result: worldName };
};

export const createLorebookNodeDefinition: NodeDefinition<CreateLorebookNodeData> = {
  type: 'createLorebookNode',
  label: 'Create Lorebook',
  category: 'Lorebook',
  component: DataDrivenNode,
  dataSchema: CreateLorebookNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: 'My Lorebook' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'worldName', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.LOREBOOK_NAME },
    ],
  },
  validate: combineValidators(createRequiredFieldValidator('worldName', 'Lorebook Name is required.')),
  execute,
  meta: {
    fields: [
      createFieldConfig({ id: 'worldName', label: 'Lorebook Name', component: STInput, props: { type: 'text' } }),
    ],
  },
};

registrator.register(createLorebookNodeDefinition);

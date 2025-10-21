import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import {
  combineValidators,
  createRequiredConnectionValidator,
  createRequiredFieldValidator,
} from '../../../utils/validation-helpers.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STInput } from 'sillytavern-utils-lib/components';

export const SetGlobalVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  _version: z.number().optional(),
});
export type SetGlobalVariableNodeData = z.infer<typeof SetGlobalVariableNodeDataSchema>;

const execute: NodeExecutor = async (node, input, context) => {
  const data = SetGlobalVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  if (!variableName) throw new Error('Variable name is required.');

  if (!('value' in input)) {
    throw new Error('A value must be provided to set a global variable.');
  }

  await context.dependencies.st_setGlobalVariable(variableName, input.value);
};

export const setGlobalVariableNodeDefinition: NodeDefinition<SetGlobalVariableNodeData> = {
  type: 'setGlobalVariableNode',
  label: 'Set Global Variable',
  category: 'Variables',
  component: DataDrivenNode,
  dataSchema: SetGlobalVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'globalVar' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.ANY },
      { id: 'variableName', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  validate: combineValidators(
    createRequiredFieldValidator('variableName', 'Variable Name is required.'),
    createRequiredConnectionValidator('value', 'A value must be connected to set.'),
  ),
  execute,
  meta: {
    fields: [
      createFieldConfig({
        id: 'variableName',
        label: 'Variable Name',
        component: STInput,
        props: { type: 'text' },
      }),
    ],
  },
};

registrator.register(setGlobalVariableNodeDefinition);

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
import { STInput } from 'sillytavern-utils-lib/components/react';

export const SetLocalVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  _version: z.number().optional(),
});
export type SetLocalVariableNodeData = z.infer<typeof SetLocalVariableNodeDataSchema>;

const execute: NodeExecutor = async (node, input, context) => {
  const data = SetLocalVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  if (!variableName) throw new Error('Variable name is required.');

  if (!('value' in input)) {
    throw new Error('A value must be provided to set a local variable.');
  }

  const value = input.value;

  await context.dependencies.st_setLocalVariable(variableName, value);
};

export const setLocalVariableNodeDefinition: NodeDefinition<SetLocalVariableNodeData> = {
  type: 'setLocalVariableNode',
  label: 'Set Local Variable',
  category: 'Variables',
  component: DataDrivenNode,
  dataSchema: SetLocalVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'chatVar' },
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

registrator.register(setLocalVariableNodeDefinition);

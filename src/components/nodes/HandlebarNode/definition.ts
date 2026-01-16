import { z } from 'zod';
import Handlebars from 'handlebars';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { HandlebarNode } from './HandlebarNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import {
  combineValidators,
  createRequiredConnectionValidator,
  createRequiredFieldValidator,
} from '../../../utils/validation-helpers.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STTextarea } from 'sillytavern-utils-lib/components/react';

export const HandlebarNodeDataSchema = z.object({
  template: z.string().default('Hello, {{name}}!'),
  _version: z.number().optional(),
});
export type HandlebarNodeData = z.infer<typeof HandlebarNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = HandlebarNodeDataSchema.parse(node.data);
  const template = resolveInput(input, data, 'template');
  const context = input.context;

  if (context === undefined) {
    throw new Error('A value must be connected to the "context" input.');
  }

  // Ensure context is an object for Handlebars compilation.
  // If a primitive is passed (e.g., a number), wrap it in { context: value }
  let templateContext = context;
  if (typeof templateContext !== 'object' || templateContext === null) {
    templateContext = { context: templateContext };
  }

  try {
    const compiled = Handlebars.compile(template, { noEscape: true, strict: true });
    return { result: compiled(templateContext) };
  } catch (e: unknown) {
    const error = e as Error;
    throw new Error(`Error executing handlebar template: ${error.message}`);
  }
};

export const handlebarNodeDefinition: NodeDefinition<HandlebarNodeData> = {
  type: 'handlebarNode',
  label: 'Handlebar',
  category: 'Utility',
  component: HandlebarNode,
  dataSchema: HandlebarNodeDataSchema,
  currentVersion: 1,
  initialData: { template: 'Hello, {{name}}!' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'template', type: FlowDataType.STRING },
      { id: 'context', type: FlowDataType.ANY },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.STRING },
    ],
  },
  validate: combineValidators(
    createRequiredFieldValidator('template', 'Template is required.'),
    createRequiredConnectionValidator('context', 'A value must be connected to the "context" input.'),
  ),
  execute,
  meta: {
    fields: [
      createFieldConfig({
        id: 'template',
        label: 'Template',
        component: STTextarea,
        props: { rows: 4 },
      }),
    ],
  },
};

registrator.register(handlebarNodeDefinition);

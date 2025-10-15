import { z } from 'zod';
import Handlebars from 'handlebars';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { HandlebarNode } from './HandlebarNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const HandlebarNodeDataSchema = z.object({
  template: z.string().default('Hello, {{name}}!'),
  _version: z.number().optional(),
});
export type HandlebarNodeData = z.infer<typeof HandlebarNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = HandlebarNodeDataSchema.parse(node.data);
  const template = resolveInput(input, data, 'template');

  let context = (input.context ?? input) || {};
  if (typeof context !== 'object') {
    context = { context: context };
  }

  try {
    const compiled = Handlebars.compile(template, { noEscape: true, strict: true });
    return { result: compiled(context) };
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
  execute,
};

registrator.register(handlebarNodeDefinition);

import Handlebars from 'handlebars';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, HandlebarNodeDataSchema } from '../../../flow-types.js';
import { HandlebarNode } from './HandlebarNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

const execute: NodeExecutor = async (node, input) => {
  const data = HandlebarNodeDataSchema.parse(node.data);
  const template = resolveInput(input, data, 'template');
  const context = { ...input };
  delete context.template;

  try {
    const compiled = Handlebars.compile(template, { noEscape: true, strict: true });
    return { result: compiled(context) };
  } catch (e: any) {
    throw new Error(`Error executing handlebar template: ${e.message}`);
  }
};

export const handlebarNodeDefinition: NodeDefinition = {
  type: 'handlebarNode',
  label: 'Handlebar',
  category: 'Utility',
  component: HandlebarNode,
  dataSchema: HandlebarNodeDataSchema,
  currentVersion: 1,
  initialData: { template: 'Hello, {{name}}!', _version: 1 },
  handles: {
    inputs: [
      { id: 'template', type: FlowDataType.STRING },
      { id: 'data', type: FlowDataType.OBJECT },
    ],
    outputs: [{ id: 'result', type: FlowDataType.STRING }],
  },
  execute,
};

registrator.register(handlebarNodeDefinition);

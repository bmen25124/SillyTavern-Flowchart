import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { SlashCommandNode } from './SlashCommandNode.js';

const ArgumentTypeSchema = z.enum(['string', 'number', 'boolean', 'list']);
export type ArgumentType = z.infer<typeof ArgumentTypeSchema>;

export const ArgumentDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Argument name cannot be empty.'),
  description: z.string().optional(),
  type: ArgumentTypeSchema.default('string'),
  isRequired: z.boolean().default(false),
  defaultValue: z.any().optional(),
});
export type ArgumentDefinition = z.infer<typeof ArgumentDefinitionSchema>;

export const SlashCommandNodeDataSchema = z.object({
  commandName: z.string().min(1, 'Command name cannot be empty.').default('my-command'),
  helpText: z.string().default('Executes a FlowChart flow.'),
  arguments: z.array(ArgumentDefinitionSchema).default([]),
  _version: z.number().optional(),
});
export type SlashCommandNodeData = z.infer<typeof SlashCommandNodeDataSchema>;

const execute: NodeExecutor = async (_node, input) => {
  return { ...input, allArgs: { ...input } };
};

function mapArgTypeToFlowType(type: ArgumentType): FlowDataType {
  switch (type) {
    case 'number':
      return FlowDataType.NUMBER;
    case 'boolean':
      return FlowDataType.BOOLEAN;
    case 'list':
      return FlowDataType.OBJECT; // Represented as an array
    case 'string':
    default:
      return FlowDataType.STRING;
  }
}

export const slashCommandNodeDefinition: NodeDefinition<SlashCommandNodeData> = {
  type: 'slashCommandNode',
  label: 'Slash Command',
  category: 'Trigger',
  component: SlashCommandNode,
  dataSchema: SlashCommandNodeDataSchema,
  currentVersion: 1,
  initialData: {
    commandName: 'my-command',
    helpText: 'Executes a FlowChart flow.',
    arguments: [],
  },
  handles: { inputs: [], outputs: [] },
  execute,
  getDynamicHandles: (node) => {
    const data = node.data;
    const namedOutputs = data.arguments.map((arg) => ({ id: arg.name, type: mapArgTypeToFlowType(arg.type) }));

    const outputs = [
      ...namedOutputs,
      { id: 'allArgs', type: FlowDataType.OBJECT, schema: z.any().describe('An object containing all arguments.') },
      {
        id: 'unnamed',
        type: FlowDataType.STRING,
        schema: z.string().describe('A single string containing all text after the named arguments.'),
      },
    ];
    return { inputs: [], outputs };
  },
};

registrator.register(slashCommandNodeDefinition);

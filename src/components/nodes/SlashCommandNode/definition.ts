import { z } from 'zod';
import { Node } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
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
  validate: (node: Node<SlashCommandNodeData>): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const data = node.data;

    if (!data.commandName || data.commandName.trim() === '') {
      issues.push({ message: 'Command Name cannot be empty.', severity: 'error' });
    } else {
      // Check for reserved command names
      const reservedNames = ['run'];
      if (reservedNames.includes(data.commandName.toLowerCase())) {
        issues.push({
          message: `Command name "${data.commandName}" is reserved and cannot be used.`,
          severity: 'error',
        });
      }

      // Check for invalid characters (basic validation)
      if (!/^[a-zA-Z0-9\-_]+$/.test(data.commandName)) {
        issues.push({
          message: 'Command name can only contain letters, numbers, hyphens, and underscores.',
          severity: 'error',
        });
      }
    }

    const argNames = new Set<string>();
    for (const arg of data.arguments) {
      if (argNames.has(arg.name)) {
        issues.push({ message: `Duplicate argument name: "${arg.name}".`, severity: 'error' });
      }
      if (arg.name.trim() === '') {
        issues.push({ message: 'Argument names cannot be empty.', severity: 'error' });
      }
      argNames.add(arg.name);
    }
    return issues;
  },
  execute,
  // MODIFIED the logic to build a dynamic schema for 'allArgs'
  getDynamicHandles: (node) => {
    const data = node.data;
    const allArgsShape: Record<string, z.ZodType> = {};

    const namedOutputs = data.arguments.map((arg) => {
      let schema: z.ZodType;
      switch (arg.type) {
        case 'number':
          schema = z.number();
          break;
        case 'boolean':
          schema = z.boolean();
          break;
        case 'list':
          schema = z.array(z.any());
          break;
        default:
          schema = z.string();
      }

      if (!arg.isRequired) {
        schema = schema.optional();
      }
      schema = schema.describe(arg.description || `The '${arg.name}' argument.`);

      // Build the shape for the 'allArgs' object while we're at it.
      allArgsShape[arg.name] = schema;

      return {
        id: arg.name,
        type: mapArgTypeToFlowType(arg.type),
        schema: schema,
      };
    });

    // Add the 'unnamed' argument to the shape and create the final schema
    const unnamedSchema = z.string().describe('A single string containing all text after the named arguments.');
    allArgsShape['unnamed'] = unnamedSchema;
    const allArgsSchema = z.object(allArgsShape);

    const outputs = [
      { id: 'main', type: FlowDataType.ANY },
      ...namedOutputs,
      { id: 'allArgs', type: FlowDataType.OBJECT, schema: allArgsSchema },
      {
        id: 'unnamed',
        type: FlowDataType.STRING,
        schema: unnamedSchema,
      },
    ];
    return { inputs: [], outputs };
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection !== 'output' || !handleId) return undefined;
    if (handleId === 'main') return FlowDataType.ANY;
    if (handleId === 'allArgs') return FlowDataType.OBJECT;
    if (handleId === 'unnamed') return FlowDataType.STRING;

    const data = node.data as SlashCommandNodeData;
    const arg = data.arguments.find((a) => a.name === handleId);
    return arg ? mapArgTypeToFlowType(arg.type) : undefined;
  },
};

registrator.register(slashCommandNodeDefinition);

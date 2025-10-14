import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { RunSlashCommandNode } from './RunSlashCommandNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const RunSlashCommandNodeDataSchema = z.object({
  command: z.string().default(''),
  _version: z.number().optional(),
});
export type RunSlashCommandNodeData = z.infer<typeof RunSlashCommandNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = RunSlashCommandNodeDataSchema.parse(node.data);
  const command = resolveInput(input, data, 'command');

  if (!command || typeof command !== 'string') throw new Error('Command input must be a valid string.');

  const result = await dependencies.executeSlashCommandsWithOptions(command);

  if (result.isError) {
    throw new Error(`Slash command failed: ${result.errorMessage}`);
  }
  if (result.isAborted) {
    throw new Error(`Slash command aborted: ${result.abortReason}`);
  }

  return { result: result.pipe ?? '' };
};

export const runSlashCommandNodeDefinition: NodeDefinition<RunSlashCommandNodeData> = {
  type: 'runSlashCommandNode',
  label: 'Run Slash Command',
  category: 'Utility',
  component: RunSlashCommandNode,
  dataSchema: RunSlashCommandNodeDataSchema,
  currentVersion: 1,
  initialData: { command: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'command', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.STRING },
    ],
  },
  validate: (node: Node<RunSlashCommandNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const isConnected = edges.some((edge) => edge.target === node.id && edge.targetHandle === 'command');
    if (!node.data.command && !isConnected) {
      issues.push({
        fieldId: 'command',
        message: 'Command is required.',
        severity: 'error',
      });
    }
    return issues;
  },
  execute,
};

registrator.register(runSlashCommandNodeDefinition);

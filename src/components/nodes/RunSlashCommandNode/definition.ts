import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { RunSlashCommandNode } from './RunSlashCommandNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';

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
  category: 'System',
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
  validate: combineValidators(createRequiredFieldValidator('command', 'Command is required.')),
  execute,
};

registrator.register(runSlashCommandNodeDefinition);

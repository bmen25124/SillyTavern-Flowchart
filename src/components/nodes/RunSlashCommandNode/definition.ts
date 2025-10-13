import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, RunSlashCommandNodeDataSchema } from '../../../flow-types.js';
import { RunSlashCommandNode } from './RunSlashCommandNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const resolveInput = <T extends object, K extends keyof T>(input: Record<string, any>, staticData: T, key: K): T[K] =>
  input[key as string] ?? staticData[key];

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

export const runSlashCommandNodeDefinition: NodeDefinition = {
  type: 'runSlashCommandNode',
  label: 'Run Slash Command',
  category: 'Utility',
  component: RunSlashCommandNode,
  dataSchema: RunSlashCommandNodeDataSchema,
  currentVersion: 1,
  initialData: { command: '', _version: 1 },
  handles: {
    inputs: [{ id: 'command', type: FlowDataType.STRING }],
    outputs: [{ id: 'result', type: FlowDataType.STRING }],
  },
  execute,
};

registrator.register(runSlashCommandNodeDefinition);

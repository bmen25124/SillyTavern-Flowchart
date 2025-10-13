import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, GetPromptNodeDataSchema } from '../../../flow-types.js';
import { GetPromptNode } from './GetPromptNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { settingsManager } from '../../../config.js';
import { resolveInput } from '../../../utils/node-logic.js';

const execute: NodeExecutor = async (node, input) => {
  const data = GetPromptNodeDataSchema.parse(node.data);
  const promptName = resolveInput(input, data, 'promptName');
  if (!promptName) throw new Error('Prompt name not provided.');

  const settings = settingsManager.getSettings();
  const prompt = settings.prompts[promptName];

  if (prompt === undefined) throw new Error(`Prompt "${promptName}" not found.`);

  return prompt;
};

export const getPromptNodeDefinition: NodeDefinition = {
  type: 'getPromptNode',
  label: 'Get Prompt',
  category: 'Utility',
  component: GetPromptNode,
  dataSchema: GetPromptNodeDataSchema,
  currentVersion: 1,
  initialData: { promptName: '', _version: 1 },
  handles: {
    inputs: [{ id: 'promptName', type: FlowDataType.STRING }],
    outputs: [{ id: null, type: FlowDataType.STRING }],
  },
  execute,
};

registrator.register(getPromptNodeDefinition);

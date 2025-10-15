import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { GetPromptNode } from './GetPromptNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { settingsManager } from '../../../config.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const GetPromptNodeDataSchema = z.object({
  promptName: z.string().optional(),
  _version: z.number().optional(),
});
export type GetPromptNodeData = z.infer<typeof GetPromptNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = GetPromptNodeDataSchema.parse(node.data);
  const promptName = resolveInput(input, data, 'promptName');
  if (!promptName) throw new Error('Prompt name not provided.');

  const settings = settingsManager.getSettings();
  const prompt = settings.prompts[promptName];

  if (prompt === undefined) throw new Error(`Prompt "${promptName}" not found.`);

  return { result: prompt };
};

export const getPromptNodeDefinition: NodeDefinition<GetPromptNodeData> = {
  type: 'getPromptNode',
  label: 'Get Prompt',
  category: 'Utility',
  component: GetPromptNode,
  dataSchema: GetPromptNodeDataSchema,
  currentVersion: 1,
  initialData: { promptName: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'promptName', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.STRING },
    ],
  },
  validate: (node: Node<GetPromptNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (!node.data.promptName && !edges.some((e) => e.target === node.id && e.targetHandle === 'promptName')) {
      issues.push({ fieldId: 'promptName', message: 'Prompt Name is required.', severity: 'error' });
    }
    return issues;
  },
  execute,
};

registrator.register(getPromptNodeDefinition);

import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { PromptUserNode } from './PromptUserNode.js';

export const PromptUserNodeDataSchema = z.object({
  message: z.string().optional(),
  defaultValue: z.string().optional(),
  _version: z.number().optional(),
});
export type PromptUserNodeData = z.infer<typeof PromptUserNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = PromptUserNodeDataSchema.parse(node.data);

  const message = resolveInput(input, data, 'message');
  const defaultValue = resolveInput(input, data, 'defaultValue');
  if (!message) {
    throw new Error('Prompt message is required.');
  }

  const result = await dependencies.promptUser(message, defaultValue);
  return { result };
};

export const promptUserNodeDefinition: NodeDefinition<PromptUserNodeData> = {
  type: 'promptUserNode',
  label: 'Prompt User',
  category: 'Utility',
  component: PromptUserNode,
  dataSchema: PromptUserNodeDataSchema,
  currentVersion: 1,
  initialData: { message: 'Please enter a value:' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'message', type: FlowDataType.STRING },
      { id: 'defaultValue', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.STRING },
    ],
  },
  validate: (node: Node<PromptUserNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (!node.data.message && !edges.some((e) => e.target === node.id && e.targetHandle === 'message')) {
      issues.push({ fieldId: 'message', message: 'Message is required.', severity: 'error' });
    }
    return issues;
  },
  execute,
};

registrator.register(promptUserNodeDefinition);

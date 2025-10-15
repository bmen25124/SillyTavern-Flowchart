import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { ConfirmUserNode } from './ConfirmUserNode.js';

export const ConfirmUserNodeDataSchema = z.object({
  message: z.string().optional(),
  _version: z.number().optional(),
});
export type ConfirmUserNodeData = z.infer<typeof ConfirmUserNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = ConfirmUserNodeDataSchema.parse(node.data);

  const message = resolveInput(input, data, 'message');
  if (!message) {
    throw new Error('Confirmation message is required.');
  }

  const result = await dependencies.confirmUser(message);
  return { activatedHandle: result ? 'true' : 'false' };
};

export const confirmUserNodeDefinition: NodeDefinition<ConfirmUserNodeData> = {
  type: 'confirmUserNode',
  label: 'Confirm With User',
  category: 'Utility',
  component: ConfirmUserNode,
  dataSchema: ConfirmUserNodeDataSchema,
  currentVersion: 1,
  initialData: { message: 'Are you sure?' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'message', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'true', type: FlowDataType.ANY },
      { id: 'false', type: FlowDataType.ANY },
    ],
  },
  validate: (node: Node<ConfirmUserNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (!node.data.message && !edges.some((e) => e.target === node.id && e.targetHandle === 'message')) {
      issues.push({ fieldId: 'message', message: 'Message is required.', severity: 'error' });
    }
    return issues;
  },
  execute,
};

registrator.register(confirmUserNodeDefinition);

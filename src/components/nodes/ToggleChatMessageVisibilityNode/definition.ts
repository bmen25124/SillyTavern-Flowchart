import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { ToggleChatMessageVisibilityNode } from './ToggleChatMessageVisibilityNode.js';

export const ToggleChatMessageVisibilityNodeDataSchema = z.object({
  startId: z.number().optional(),
  endId: z.number().optional(),
  visible: z.boolean().default(true),
  _version: z.number().optional(),
});
export type ToggleChatMessageVisibilityNodeData = z.infer<typeof ToggleChatMessageVisibilityNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = ToggleChatMessageVisibilityNodeDataSchema.parse(node.data);
  const startId = resolveInput(input, data, 'startId');
  const endId = resolveInput(input, data, 'endId') ?? startId; // Default end to start if not provided
  const visible = resolveInput(input, data, 'visible');

  if (startId === undefined) {
    throw new Error('Start Message ID is required.');
  }
  if (endId === undefined) {
    throw new Error('End Message ID is required.');
  }

  await dependencies.hideChatMessageRange(startId, endId, visible);
  // Returns void, passthrough is handled by runner.
};

export const toggleChatMessageVisibilityNodeDefinition: NodeDefinition<ToggleChatMessageVisibilityNodeData> = {
  type: 'toggleChatMessageVisibilityNode',
  label: 'Hide/Show Message (Context)',
  category: 'Chat',
  component: ToggleChatMessageVisibilityNode,
  dataSchema: ToggleChatMessageVisibilityNodeDataSchema,
  currentVersion: 1,
  initialData: { visible: false }, // Default to hiding
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'startId', type: FlowDataType.NUMBER },
      { id: 'endId', type: FlowDataType.NUMBER },
      { id: 'visible', type: FlowDataType.BOOLEAN },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  validate: (node: Node<ToggleChatMessageVisibilityNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (node.data.startId === undefined && !edges.some((e) => e.target === node.id && e.targetHandle === 'startId')) {
      issues.push({ fieldId: 'startId', message: 'Start Message ID is required.', severity: 'error' });
    }
    return issues;
  },
  execute,
};

registrator.register(toggleChatMessageVisibilityNodeDefinition);

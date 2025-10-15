import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { SendChatMessageNode } from './SendChatMessageNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const SendChatMessageNodeDataSchema = z.object({
  message: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system']).default('assistant'),
  name: z.string().optional(),
  _version: z.number().optional(),
});
export type SendChatMessageNodeData = z.infer<typeof SendChatMessageNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = SendChatMessageNodeDataSchema.parse(node.data);
  const message = resolveInput(input, data, 'message');
  if (!message) throw new Error('Message content is required.');

  const role = resolveInput(input, data, 'role');
  const name = resolveInput(input, data, 'name');
  await dependencies.sendChatMessage(message, role, name);

  const newChatLength = dependencies.getSillyTavernContext().chat.length;
  // Only return the new data, not the passthrough value.
  return { messageId: newChatLength - 1 };
};

export const sendChatMessageNodeDefinition: NodeDefinition<SendChatMessageNodeData> = {
  type: 'sendChatMessageNode',
  label: 'Send Chat Message',
  category: 'Chat',
  component: SendChatMessageNode,
  dataSchema: SendChatMessageNodeDataSchema,
  currentVersion: 1,
  initialData: { message: '', role: 'assistant' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'message', type: FlowDataType.STRING },
      { id: 'role', type: FlowDataType.STRING },
      { id: 'name', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'messageId', type: FlowDataType.NUMBER },
    ],
  },
  validate: (node: Node<SendChatMessageNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (!node.data.message && !edges.some((e) => e.target === node.id && e.targetHandle === 'message')) {
      issues.push({ fieldId: 'message', message: 'Message Content is required.', severity: 'error' });
    }
    return issues;
  },
  execute,
};

registrator.register(sendChatMessageNodeDefinition);

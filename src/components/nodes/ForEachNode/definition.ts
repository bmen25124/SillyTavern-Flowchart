import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { ForEachNode } from './ForEachNode.js';

export const ForEachNodeDataSchema = z.object({
  flowId: z.string().optional(),
  _version: z.number().optional(),
});
export type ForEachNodeData = z.infer<typeof ForEachNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies, depth }) => {
  const data = ForEachNodeDataSchema.parse(node.data);
  const flowId = resolveInput(input, data, 'flowId');
  const array = input.array;

  if (!flowId) throw new Error('Flow to Run is required.');
  if (!Array.isArray(array)) throw new Error('The "array" input must be a valid array.');

  const results = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const report = await dependencies.executeSubFlow(flowId, { item, index: i }, depth + 1);

    if (report.error) {
      throw new Error(`Sub-flow in ForEach loop failed on item ${i}: ${report.error.message}`);
    }
    results.push(report.lastOutput);
  }

  return { results };
};

export const forEachNodeDefinition: NodeDefinition<ForEachNodeData> = {
  type: 'forEachNode',
  label: 'For Each',
  category: 'Logic',
  component: ForEachNode,
  dataSchema: ForEachNodeDataSchema,
  currentVersion: 1,
  initialData: { flowId: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'flowId', type: FlowDataType.STRING },
      { id: 'array', type: FlowDataType.OBJECT },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'results', type: FlowDataType.OBJECT, schema: z.array(z.any()) },
    ],
  },
  validate: (node: Node<ForEachNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (!node.data.flowId && !edges.some((edge) => edge.target === node.id && edge.targetHandle === 'flowId')) {
      issues.push({
        fieldId: 'flowId',
        message: 'Flow to Run is required.',
        severity: 'error',
      });
    }
    if (!edges.some((edge) => edge.target === node.id && edge.targetHandle === 'array')) {
      issues.push({
        message: 'An array must be connected to the "array" input.',
        severity: 'error',
      });
    }
    return issues;
  },
  execute,
};

registrator.register(forEachNodeDefinition);

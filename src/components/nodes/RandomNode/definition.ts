import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { RandomNode } from './RandomNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const RandomNodeDataSchema = z.object({
  mode: z.enum(['number', 'array']).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  _version: z.number().optional(),
});
export type RandomNodeData = z.infer<typeof RandomNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = RandomNodeDataSchema.parse(node.data);
  const mode = resolveInput(input, data, 'mode') ?? 'number';

  if (mode === 'number') {
    const min = resolveInput(input, data, 'min') ?? 0;
    const max = resolveInput(input, data, 'max') ?? 100;
    return { result: Math.random() * (max - min) + min };
  }
  if (mode === 'array') {
    const arr = input.array;
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('Input is not a non-empty array.');
    const randomIndex = Math.floor(Math.random() * arr.length);
    return { result: arr[randomIndex] };
  }
  throw new Error(`Unknown random mode: ${mode}`);
};

export const randomNodeDefinition: NodeDefinition<RandomNodeData> = {
  type: 'randomNode',
  label: 'Random',
  category: 'Utility',
  component: RandomNode,
  dataSchema: RandomNodeDataSchema,
  currentVersion: 1,
  initialData: { mode: 'number', min: 0, max: 100 },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'mode', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  validate: (node: Node<RandomNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (node.data.mode === 'array') {
      const isConnected = edges.some((edge) => edge.target === node.id && edge.targetHandle === 'array');
      if (!isConnected) {
        issues.push({ message: 'The "array" input must be connected in "From Array" mode.', severity: 'error' });
      }
    }
    return issues;
  },
  execute,
  getDynamicHandles: (node) => {
    const data = node.data as RandomNodeData;
    const inputs = [];
    const outputs = [];

    if (data.mode === 'number') {
      inputs.push({ id: 'min', type: FlowDataType.NUMBER });
      inputs.push({ id: 'max', type: FlowDataType.NUMBER });
      outputs.push({ id: 'result', type: FlowDataType.NUMBER }); // Correctly typed output
    } else if (data.mode === 'array') {
      inputs.push({ id: 'array', type: FlowDataType.OBJECT });
      outputs.push({ id: 'result', type: FlowDataType.ANY }); // Type of element is unknown
    } else {
      // Fallback case if mode is somehow undefined
      outputs.push({ id: 'result', type: FlowDataType.ANY });
    }

    return { inputs, outputs };
  },
};

registrator.register(randomNodeDefinition);

import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { SetVariableNode } from './SetVariableNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const SetVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  _version: z.number().optional(),
});
export type SetVariableNodeData = z.infer<typeof SetVariableNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { executionVariables }) => {
  const data = SetVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  const value = input.value;
  if (!variableName) throw new Error('Variable name is required.');

  executionVariables.set(variableName, value);
  // Returns void. The runner handles the passthrough automatically.
};

export const setVariableNodeDefinition: NodeDefinition<SetVariableNodeData> = {
  type: 'setVariableNode',
  label: 'Set Variable',
  category: 'Utility',
  component: SetVariableNode,
  dataSchema: SetVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'myVar' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.ANY },
      { id: 'variableName', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  validate: (node: Node<SetVariableNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const isNameConnected = edges.some((edge) => edge.target === node.id && edge.targetHandle === 'variableName');
    if (!node.data.variableName && !isNameConnected) {
      issues.push({
        fieldId: 'variableName',
        message: 'Variable Name is required.',
        severity: 'error',
      });
    }
    const isValueConnected = edges.some((edge) => edge.target === node.id && edge.targetHandle === 'value');
    if (!isValueConnected) {
      issues.push({
        message: 'A value must be connected to set.',
        severity: 'error',
      });
    }
    return issues;
  },
  execute,
};

registrator.register(setVariableNodeDefinition);

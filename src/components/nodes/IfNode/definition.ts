import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { IfNode } from './IfNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { get } from '../../../utils/node-logic.js';
import { getHandleSpec } from '../../../utils/handle-logic.js';

export const OPERATORS = [
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'contains',
  'not_contains',
  'is_empty',
  'is_not_empty',
] as const;
export type Operator = (typeof OPERATORS)[number];

export const ConditionSchema = z.object({
  id: z.string(),
  mode: z.enum(['simple', 'advanced']).default('simple'),
  // Simple mode fields
  inputProperty: z.string().default(''),
  operator: z.enum(OPERATORS).default('equals'),
  value: z.any().optional(),
  // Advanced mode field
  code: z.string().default('return true;'),
});
export type Condition = z.infer<typeof ConditionSchema>;

export const IfNodeDataSchema = z.object({
  conditions: z.array(ConditionSchema).min(1),
  _version: z.number().optional(),
});
export type IfNodeData = z.infer<typeof IfNodeDataSchema>;

const getConditionValueHandleId = (conditionId: string) => `value_${conditionId}`;

const execute: NodeExecutor = async (node, input, { dependencies, executionVariables }) => {
  const data = IfNodeDataSchema.parse(node.data);
  const primaryInput = input.value; // The data from the 'value' input handle

  for (const condition of data.conditions) {
    let result = false;

    if (condition.mode === 'simple') {
      const propertyValue = condition.inputProperty
        ? get(primaryInput, condition.inputProperty, undefined)
        : primaryInput;
      const comparisonValue = input[getConditionValueHandleId(condition.id)] ?? condition.value;

      switch (condition.operator) {
        case 'equals':
          result = propertyValue == comparisonValue;
          break;
        case 'not_equals':
          result = propertyValue != comparisonValue;
          break;
        case 'greater_than':
          result = propertyValue > comparisonValue;
          break;
        case 'less_than':
          result = propertyValue < comparisonValue;
          break;
        case 'contains':
          result = String(propertyValue).includes(String(comparisonValue));
          break;
        case 'not_contains':
          result = !String(propertyValue).includes(String(comparisonValue));
          break;
        case 'is_empty':
          result = propertyValue === '' || propertyValue === null || propertyValue === undefined;
          break;
        case 'is_not_empty':
          result = propertyValue !== '' && propertyValue !== null && propertyValue !== undefined;
          break;
      }
    } else {
      const context = primaryInput ?? input;
      const variables = { ...Object.fromEntries(executionVariables) };
      try {
        const func = new Function('input', 'variables', 'stContext', condition.code);
        result = !!func(context, variables, dependencies.getSillyTavernContext());
      } catch (error: any) {
        throw new Error(`Error executing condition code: ${error.message}`);
      }
    }

    if (result) {
      return { activatedHandle: condition.id };
    }
  }

  return { activatedHandle: 'false' };
};

export const ifNodeDefinition: NodeDefinition<IfNodeData> = {
  type: 'ifNode',
  label: 'If',
  category: 'Logic',
  component: IfNode,
  dataSchema: IfNodeDataSchema,
  currentVersion: 1,
  initialData: {
    conditions: [
      {
        id: crypto.randomUUID(),
        mode: 'simple',
        inputProperty: '',
        operator: 'equals',
        value: '',
        code: 'return true;',
      },
    ],
  },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.ANY },
    ],
    outputs: [], // Make ALL outputs dynamic
  },
  validate: (node: Node<IfNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const outgoingEdges = edges.filter((edge) => edge.source === node.id);
    if (outgoingEdges.length === 0) {
      issues.push({ message: 'Node is a dead end. Connect at least one output.', severity: 'warning' });
    }
    return issues;
  },
  execute,
  isDangerous: true,
  getDynamicHandles: (node, allNodes, allEdges) => {
    const conditions = (node.data as IfNodeData).conditions || [];

    const inputEdge = allEdges.find((e) => e.target === node.id && e.targetHandle === 'main');
    const sourceNode = inputEdge ? allNodes.find((n) => n.id === inputEdge.source) : undefined;

    let passthroughType = FlowDataType.ANY;
    // @ts-ignore
    let passthroughSchema;

    if (sourceNode && inputEdge) {
      const sourceSpec = getHandleSpec(sourceNode, inputEdge.sourceHandle || null, 'output', allNodes, allEdges);
      if (sourceSpec) {
        passthroughType = sourceSpec.type;
        passthroughSchema = sourceSpec.schema;
      }
    }

    const conditionalOutputs = conditions.map((c) => ({
      id: c.id,
      type: passthroughType,
      // @ts-ignore
      schema: passthroughSchema,
    }));

    // Add the 'false' handle to the dynamic list
    const allOutputs = [
      { id: 'main', type: passthroughType, schema: passthroughSchema },
      ...conditionalOutputs,
      { id: 'false', type: passthroughType, schema: passthroughSchema },
    ];

    return {
      inputs: conditions.map((c) => ({ id: getConditionValueHandleId(c.id), type: FlowDataType.ANY })),
      outputs: allOutputs,
    };
  },
  getHandleType: ({ handleId, handleDirection, node, nodes, edges }) => {
    if (handleDirection === 'input') {
      if (handleId === 'main') return FlowDataType.ANY;
      if (handleId === 'value') return FlowDataType.ANY;
      const conditions = (node.data as IfNodeData).conditions || [];
      const isValueHandle = conditions.some((c) => getConditionValueHandleId(c.id) === handleId);
      if (isValueHandle) return FlowDataType.ANY;
    }

    if (handleDirection === 'output') {
      const conditions = (node.data as IfNodeData).conditions || [];
      const isConditionHandle = conditions.some((c) => c.id === handleId);

      if (handleId === 'main' || handleId === 'false' || isConditionHandle) {
        const inputEdge = edges.find((e) => e.target === node.id && e.targetHandle === 'main');
        if (inputEdge) {
          const sourceNode = nodes.find((n) => n.id === inputEdge.source);
          if (sourceNode) {
            const sourceSpec = getHandleSpec(sourceNode, inputEdge.sourceHandle || null, 'output', nodes, edges);
            return sourceSpec?.type ?? FlowDataType.ANY;
          }
        }
        return FlowDataType.ANY;
      }
    }
    return undefined;
  },
};

registrator.register(ifNodeDefinition);

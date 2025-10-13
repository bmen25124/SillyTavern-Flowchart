import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { IfNode } from './IfNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { get } from '../../../utils/node-logic.js';

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

  for (const condition of data.conditions) {
    let result = false;

    if (condition.mode === 'simple') {
      const propertyValue = condition.inputProperty ? get(input, condition.inputProperty, undefined) : input;
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
      const context = input ?? {};
      const variables = { ...Object.fromEntries(executionVariables) };
      try {
        const func = new Function('input', 'variables', 'stContext', condition.code);
        result = !!func(context, variables, dependencies.getSillyTavernContext());
      } catch (error: any) {
        throw new Error(`Error executing condition code: ${error.message}`);
      }
    }

    if (result) {
      return { ...input, activatedHandle: condition.id };
    }
  }

  return { ...input, activatedHandle: 'false' };
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
    inputs: [{ id: null, type: FlowDataType.ANY }], // Use a default, unnamed input handle
    outputs: [{ id: 'false', type: FlowDataType.ANY }],
  },
  execute,
  isDangerous: true,
  getDynamicHandles: (node) => {
    const conditions = (node.data as IfNodeData).conditions || [];
    return {
      inputs: conditions.map((c) => ({ id: getConditionValueHandleId(c.id), type: FlowDataType.ANY })),
      outputs: conditions.map((c) => ({ id: c.id, type: FlowDataType.ANY })),
    };
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    const conditions = (node.data as IfNodeData).conditions || [];
    if (handleDirection === 'output') {
      const isConditionHandle = conditions.some((c) => c.id === handleId);
      if (handleId === 'false' || isConditionHandle) return FlowDataType.ANY;
    }
    if (handleDirection === 'input') {
      if (handleId === null) return FlowDataType.ANY; // Check for the default handle
      const isValueHandle = conditions.some((c) => getConditionValueHandleId(c.id) === handleId);
      if (isValueHandle) return FlowDataType.ANY;
    }
    return undefined;
  },
};

registrator.register(ifNodeDefinition);

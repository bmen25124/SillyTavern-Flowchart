import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue, HandleSpec } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { getHandleSpec } from '../../../utils/handle-logic.js';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import React from 'react';

export const ArrayToolsNodeDataSchema = z.object({
  operation: z
    .enum(['length', 'get_by_index', 'slice', 'push', 'pop', 'shift', 'unshift', 'reverse', 'includes'])
    .optional(),
  index: z.number().optional(),
  endIndex: z.number().optional(),
  value: z.any().optional(),
  _version: z.number().optional(),
});
export type ArrayToolsNodeData = z.infer<typeof ArrayToolsNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = ArrayToolsNodeDataSchema.parse(node.data);
  const operation = resolveInput(input, data, 'operation') ?? 'length';
  const array = input.array;

  if (!Array.isArray(array)) {
    throw new Error('An array must be connected to the "Array" input.');
  }

  // Use structuredClone to avoid mutating the original array passed between nodes.
  const arrayCopy = structuredClone(array);

  switch (operation) {
    case 'length':
      return { result: array.length };
    case 'get_by_index': {
      const index = resolveInput(input, data, 'index');
      if (typeof index !== 'number') throw new Error('Index must be a number.');
      return { result: array[index] };
    }
    case 'slice': {
      const start = resolveInput(input, data, 'index') ?? 0;
      const end = resolveInput(input, data, 'endIndex');
      return { result: array.slice(start, end) };
    }
    case 'push': {
      const value = resolveInput(input, data, 'value');
      if (value === undefined) throw new Error('Value to push is required.');
      arrayCopy.push(value);
      return { result: arrayCopy };
    }
    case 'pop': {
      const poppedItem = arrayCopy.pop();
      return { array: arrayCopy, item: poppedItem };
    }
    case 'shift': {
      const shiftedItem = arrayCopy.shift();
      return { array: arrayCopy, item: shiftedItem };
    }
    case 'unshift': {
      const value = resolveInput(input, data, 'value');
      if (value === undefined) throw new Error('Value to unshift is required.');
      arrayCopy.unshift(value);
      return { result: arrayCopy };
    }
    case 'reverse':
      return { result: arrayCopy.reverse() };
    case 'includes': {
      const value = resolveInput(input, data, 'value');
      if (value === undefined) throw new Error('Value to check for is required.');
      return { result: array.includes(value) };
    }
    default:
      throw new Error(`Unknown array operation: ${operation}`);
  }
};

const allOperations = [
  'length',
  'get_by_index',
  'slice',
  'push',
  'pop',
  'shift',
  'unshift',
  'reverse',
  'includes',
] as const;

export const arrayToolsNodeDefinition: NodeDefinition<ArrayToolsNodeData> = {
  type: 'arrayToolsNode',
  label: 'Array Tools',
  category: 'Data Processing',
  component: DataDrivenNode,
  dataSchema: ArrayToolsNodeDataSchema,
  currentVersion: 1,
  initialData: { operation: 'length' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'operation', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  validate: (node: Node<ArrayToolsNodeData>, edges: Edge[]): ValidationIssue[] => {
    const isArrayConnected = edges.some((edge) => edge.target === node.id && edge.targetHandle === 'array');
    if (!isArrayConnected) {
      return [{ message: 'An array must be connected to the "Array" input.', severity: 'error' }];
    }
    return [];
  },
  execute,
  getDynamicHandles: (node, allNodes, allEdges) => {
    const data = node.data as ArrayToolsNodeData;
    const inputs: HandleSpec[] = [{ id: 'array', type: FlowDataType.ARRAY }];
    let outputs: HandleSpec[] = [];

    // Find the schema of the connected array to infer item types
    const arrayInputEdge = allEdges.find((e) => e.target === node.id && e.targetHandle === 'array');
    let arraySchema: z.ZodArray<any> | undefined;
    let itemSchema: z.ZodType | undefined;
    let itemType: FlowDataType = FlowDataType.ANY;

    if (arrayInputEdge) {
      const sourceNode = allNodes.find((n) => n.id === arrayInputEdge.source);
      if (sourceNode) {
        const sourceSpec = getHandleSpec(sourceNode, arrayInputEdge.sourceHandle || null, 'output', allNodes, allEdges);
        if (sourceSpec?.schema instanceof z.ZodArray) {
          arraySchema = sourceSpec.schema;
          itemSchema = arraySchema.element;
          // @ts-ignore
          itemType = zodTypeToFlowType(itemSchema);
        }
      }
    }

    switch (data.operation) {
      case 'length':
        outputs.push({ id: 'result', type: FlowDataType.NUMBER });
        break;
      case 'get_by_index':
        inputs.push({ id: 'index', type: FlowDataType.NUMBER });
        outputs.push({ id: 'result', type: itemType, schema: itemSchema });
        break;
      case 'slice':
        inputs.push({ id: 'index', type: FlowDataType.NUMBER, label: 'Start Index' });
        inputs.push({ id: 'endIndex', type: FlowDataType.NUMBER, label: 'End Index' });
        outputs.push({ id: 'result', type: FlowDataType.ARRAY, schema: arraySchema });
        break;
      case 'push':
      case 'unshift':
        inputs.push({ id: 'value', type: itemType, schema: itemSchema });
        outputs.push({ id: 'result', type: FlowDataType.ARRAY, schema: arraySchema });
        break;
      case 'pop':
      case 'shift':
        outputs.push({ id: 'array', type: FlowDataType.ARRAY, schema: arraySchema, label: 'Modified Array' });
        outputs.push({ id: 'item', type: itemType, schema: itemSchema, label: 'Removed Item' });
        break;
      case 'reverse':
        outputs.push({ id: 'result', type: FlowDataType.ARRAY, schema: arraySchema });
        break;
      case 'includes':
        inputs.push({ id: 'value', type: itemType, schema: itemSchema });
        outputs.push({ id: 'result', type: FlowDataType.BOOLEAN });
        break;
    }
    return { inputs, outputs };
  },
  meta: {
    fields: (data) => {
      const operation = data?.operation ?? 'length';
      const baseFields = [
        createFieldConfig({
          id: 'operation',
          label: 'Operation',
          component: STSelect,
          options: allOperations.map((op) => ({ value: op, label: op.replace(/_/g, ' ') })),
        }),
      ];

      if (['get_by_index', 'slice'].includes(operation)) {
        baseFields.push(
          createFieldConfig({
            id: 'index',
            label: operation === 'slice' ? 'Start Index' : 'Index',
            component: STInput,
            props: { type: 'number' },
            getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
          }),
        );
      }
      if (operation === 'slice') {
        baseFields.push(
          createFieldConfig({
            id: 'endIndex',
            label: 'End Index (optional)',
            component: STInput,
            props: { type: 'number' },
            getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) =>
              e.target.value === '' ? undefined : Number(e.target.value),
          }),
        );
      }
      if (['push', 'unshift', 'includes'].includes(operation)) {
        baseFields.push(
          createFieldConfig({
            id: 'value',
            label: 'Value',
            component: STInput,
            props: { type: 'text' },
          }),
        );
      }

      return baseFields;
    },
  },
};

registrator.register(arrayToolsNodeDefinition);

import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components';
import React from 'react';

export const MathNodeDataSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'modulo']).optional(),
  a: z.number().optional(),
  b: z.number().optional(),
  _version: z.number().optional(),
});
export type MathNodeData = z.infer<typeof MathNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = MathNodeDataSchema.parse(node.data);
  const operation = resolveInput(input, data, 'operation') ?? 'add';
  const a = resolveInput(input, data, 'a') ?? 0;
  const b = resolveInput(input, data, 'b') ?? 0;

  if (typeof a !== 'number' || typeof b !== 'number') throw new Error('Both inputs must be numbers.');

  switch (operation) {
    case 'add':
      return { result: a + b };
    case 'subtract':
      return { result: a - b };
    case 'multiply':
      return { result: a * b };
    case 'divide':
      if (b === 0) throw new Error('Division by zero.');
      return { result: a / b };
    case 'modulo':
      if (b === 0) throw new Error('Division by zero for modulo.');
      return { result: a % b };
    default:
      throw new Error(`Unknown math operation: ${operation}`);
  }
};

const operations = ['add', 'subtract', 'multiply', 'divide', 'modulo'] as const;

export const mathNodeDefinition: NodeDefinition<MathNodeData> = {
  type: 'mathNode',
  label: 'Math',
  category: 'Math & Logic',
  component: DataDrivenNode,
  dataSchema: MathNodeDataSchema,
  currentVersion: 1,
  initialData: { operation: 'add', a: 0, b: 0 },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'operation', type: FlowDataType.STRING },
      { id: 'a', type: FlowDataType.NUMBER },
      { id: 'b', type: FlowDataType.NUMBER },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.NUMBER },
    ],
  },
  execute,
  meta: {
    fields: [
      createFieldConfig({
        id: 'operation',
        label: 'Operation',
        component: STSelect,
        options: operations.map((op) => ({ value: op, label: op })),
      }),
      createFieldConfig({
        id: 'a',
        label: 'Value A',
        component: STInput,
        props: { type: 'number' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
      }),
      createFieldConfig({
        id: 'b',
        label: 'Value B',
        component: STInput,
        props: { type: 'number' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
      }),
    ],
  },
};

registrator.register(mathNodeDefinition);

import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, MathNodeDataSchema } from '../../../flow-types.js';
import { MathNode } from './MathNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const resolveInput = <T extends object, K extends keyof T>(input: Record<string, any>, staticData: T, key: K): T[K] =>
  input[key as string] ?? staticData[key];

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

export const mathNodeDefinition: NodeDefinition = {
  type: 'mathNode',
  label: 'Math',
  category: 'Utility',
  component: MathNode,
  dataSchema: MathNodeDataSchema,
  currentVersion: 1,
  initialData: { operation: 'add', a: 0, b: 0, _version: 1 },
  handles: {
    inputs: [
      { id: 'operation', type: FlowDataType.STRING },
      { id: 'a', type: FlowDataType.NUMBER },
      { id: 'b', type: FlowDataType.NUMBER },
    ],
    outputs: [{ id: 'result', type: FlowDataType.NUMBER }],
  },
  execute,
};

registrator.register(mathNodeDefinition);

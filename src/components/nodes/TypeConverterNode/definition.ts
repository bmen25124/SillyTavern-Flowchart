import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, TypeConverterNodeDataSchema, TypeConverterNodeData } from '../../../flow-types.js';
import { TypeConverterNode } from './TypeConverterNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const resolveInput = <T extends object, K extends keyof T>(input: Record<string, any>, staticData: T, key: K): T[K] =>
  input[key as string] ?? staticData[key];

const execute: NodeExecutor = async (node, input) => {
  const data = TypeConverterNodeDataSchema.parse(node.data);
  const targetType = resolveInput(input, data, 'targetType') ?? 'string';
  const value = input.value;

  if (value === undefined) {
    switch (targetType) {
      case 'string':
        return { result: '' };
      case 'number':
        return { result: 0 };
      case 'object':
        return { result: {} };
      case 'array':
        return { result: [] };
    }
  }

  try {
    switch (targetType) {
      case 'string':
        return { result: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value) };
      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) throw new Error(`'${value}' cannot be converted to a number.`);
        return { result: num };
      case 'object':
      case 'array':
        if (typeof value === 'object') return { result: value };
        if (typeof value !== 'string') throw new Error('Input must be a JSON string to convert.');
        const parsed = JSON.parse(value);
        if (targetType === 'array' && !Array.isArray(parsed)) throw new Error('Parsed JSON is not an array.');
        if (targetType === 'object' && (Array.isArray(parsed) || typeof parsed !== 'object')) {
          throw new Error('Parsed JSON is not an object.');
        }
        return { result: parsed };
      default:
        throw new Error(`Unsupported target type: ${targetType}`);
    }
  } catch (e: any) {
    throw new Error(`Type conversion failed: ${e.message}`);
  }
};

export const typeConverterNodeDefinition: NodeDefinition = {
  type: 'typeConverterNode',
  label: 'Type Converter',
  category: 'Utility',
  component: TypeConverterNode,
  dataSchema: TypeConverterNodeDataSchema,
  currentVersion: 1,
  initialData: { targetType: 'string', _version: 1 },
  handles: {
    inputs: [
      { id: 'value', type: FlowDataType.ANY },
      { id: 'targetType', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'result', type: FlowDataType.ANY }],
  },
  execute,
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'output' && handleId === 'result') {
      const data = node.data as TypeConverterNodeData;
      switch (data.targetType) {
        case 'string':
          return FlowDataType.STRING;
        case 'number':
          return FlowDataType.NUMBER;
        case 'object':
        case 'array':
          return FlowDataType.OBJECT;
        default:
          return FlowDataType.ANY;
      }
    }
    return undefined;
  },
};

registrator.register(typeConverterNodeDefinition);

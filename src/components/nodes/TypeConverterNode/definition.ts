import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STSelect } from 'sillytavern-utils-lib/components';

export const TypeConverterNodeDataSchema = z.object({
  targetType: z.enum(['string', 'number', 'object', 'array']).default('string'),
  _version: z.number().optional(),
});
export type TypeConverterNodeData = z.infer<typeof TypeConverterNodeDataSchema>;

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
  } catch (e: unknown) {
    const error = e as Error;
    throw new Error(`Type conversion failed: ${error.message}`);
  }
};

export const typeConverterNodeDefinition: NodeDefinition<TypeConverterNodeData> = {
  type: 'typeConverterNode',
  label: 'Type Converter',
  category: 'Data Processing',
  component: DataDrivenNode,
  dataSchema: TypeConverterNodeDataSchema,
  currentVersion: 1,
  initialData: { targetType: 'string' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.ANY },
      { id: 'targetType', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  execute,
  getDynamicHandles: (node) => {
    const data = node.data as TypeConverterNodeData;
    let resultType: FlowDataType;
    switch (data.targetType) {
      case 'string':
        resultType = FlowDataType.STRING;
        break;
      case 'number':
        resultType = FlowDataType.NUMBER;
        break;
      case 'object':
        resultType = FlowDataType.OBJECT;
        break;
      case 'array':
        resultType = FlowDataType.ARRAY;
        break;
      default:
        resultType = FlowDataType.ANY;
    }
    return {
      inputs: [],
      outputs: [{ id: 'result', type: resultType }],
    };
  },
  getSuggestionBlueprints: ({ direction }) => {
    if (direction !== 'outputs') return [];
    return [
      { id: 'target-number', labelSuffix: '(Number)', dataOverrides: { targetType: 'number' } },
      { id: 'target-object', labelSuffix: '(Object)', dataOverrides: { targetType: 'object' } },
      { id: 'target-array', labelSuffix: '(Array)', dataOverrides: { targetType: 'array' } },
    ];
  },
  meta: {
    fields: [
      createFieldConfig({
        id: 'targetType',
        label: 'Convert To',
        component: STSelect,
        options: [
          { value: 'string', label: 'String' },
          { value: 'number', label: 'Number' },
          { value: 'object', label: 'Object (from JSON string)' },
          { value: 'array', label: 'Array (from JSON string)' },
        ],
      }),
    ],
  },
};

registrator.register(typeConverterNodeDefinition);

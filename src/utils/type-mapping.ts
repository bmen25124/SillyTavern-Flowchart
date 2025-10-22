import { z } from 'zod';
import { FlowDataType } from '../flow-types.js';

function resolveType(schema: z.ZodType): z.ZodType {
  let currentSchema: z.ZodType = schema;

  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    if ('unwrap' in currentSchema && typeof currentSchema.unwrap === 'function') {
      currentSchema = currentSchema.unwrap();
    }
    if ('innerType' in currentSchema && typeof currentSchema.innerType === 'function') {
      currentSchema = currentSchema.innerType();
    }
    return resolveType(currentSchema);
  }

  return currentSchema;
}

export function zodTypeToFlowType(type: z.ZodType): FlowDataType {
  const coreType = resolveType(type);

  if (coreType instanceof z.ZodString) return FlowDataType.STRING;
  if (coreType instanceof z.ZodNumber) return FlowDataType.NUMBER;
  if (coreType instanceof z.ZodBoolean) return FlowDataType.BOOLEAN;
  if (coreType instanceof z.ZodObject) return FlowDataType.OBJECT;
  if (coreType instanceof z.ZodEnum) return FlowDataType.OBJECT;
  if (coreType instanceof z.ZodArray) return FlowDataType.ARRAY;

  return FlowDataType.ANY;
}

export function valueToFlowType(value: any): FlowDataType {
  if (value === null || value === undefined) return FlowDataType.ANY;
  if (Array.isArray(value)) return FlowDataType.ARRAY;
  switch (typeof value) {
    case 'string':
      return FlowDataType.STRING;
    case 'number':
      return FlowDataType.NUMBER;
    case 'boolean':
      return FlowDataType.BOOLEAN;
    case 'object':
      return FlowDataType.OBJECT;
    default:
      return FlowDataType.ANY;
  }
}

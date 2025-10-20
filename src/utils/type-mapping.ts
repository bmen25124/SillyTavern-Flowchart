import { z } from 'zod';
import { FlowDataType } from '../flow-types.js';

export function zodTypeToFlowType(type: z.ZodType): FlowDataType {
  if (type instanceof z.ZodNumber) return FlowDataType.NUMBER;
  if (type instanceof z.ZodString) return FlowDataType.STRING;
  if (type instanceof z.ZodBoolean) return FlowDataType.BOOLEAN;
  if (type instanceof z.ZodArray) return FlowDataType.ARRAY;
  if (type instanceof z.ZodObject || type instanceof z.ZodEnum) return FlowDataType.OBJECT;
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

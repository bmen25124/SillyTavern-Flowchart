import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { DateTimeNode } from './DateTimeNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

export const DateTimeNodeDataSchema = z.object({
  format: z.string().optional(),
  _version: z.number().optional(),
});
export type DateTimeNodeData = z.infer<typeof DateTimeNodeDataSchema>;

const execute: NodeExecutor = async () => {
  const now = new Date();
  return {
    iso: now.toISOString(),
    timestamp: now.getTime(),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
  };
};

export const dateTimeNodeDefinition: NodeDefinition<DateTimeNodeData> = {
  type: 'dateTimeNode',
  label: 'Date/Time',
  category: 'Utility',
  component: DateTimeNode,
  dataSchema: DateTimeNodeDataSchema,
  currentVersion: 1,
  initialData: {},
  handles: {
    inputs: [{ id: 'format', type: FlowDataType.STRING }],
    outputs: [
      { id: 'iso', type: FlowDataType.STRING },
      { id: 'timestamp', type: FlowDataType.NUMBER },
      { id: 'year', type: FlowDataType.NUMBER },
      { id: 'month', type: FlowDataType.NUMBER },
      { id: 'day', type: FlowDataType.NUMBER },
      { id: 'hour', type: FlowDataType.NUMBER },
      { id: 'minute', type: FlowDataType.NUMBER },
      { id: 'second', type: FlowDataType.NUMBER },
    ],
  },
  execute,
};

registrator.register(dateTimeNodeDefinition);

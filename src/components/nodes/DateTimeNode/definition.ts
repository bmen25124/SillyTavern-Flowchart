import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, DateTimeNodeDataSchema } from '../../../flow-types.js';
import { DateTimeNode } from './DateTimeNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

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

export const dateTimeNodeDefinition: NodeDefinition = {
  type: 'dateTimeNode',
  label: 'Date/Time',
  category: 'Utility',
  component: DateTimeNode,
  dataSchema: DateTimeNodeDataSchema,
  currentVersion: 1,
  initialData: { _version: 1 },
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

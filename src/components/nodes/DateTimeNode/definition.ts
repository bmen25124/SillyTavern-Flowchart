import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { DateTimeNode } from './DateTimeNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const DateTimeNodeDataSchema = z.object({
  format: z.string().optional(),
  _version: z.number().optional(),
});
export type DateTimeNodeData = z.infer<typeof DateTimeNodeDataSchema>;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatDate(date: Date, pattern: string): string {
  const Y = date.getFullYear();
  const M = date.getMonth() + 1;
  const D = date.getDate();
  const H = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();

  const tokens: Record<string, string> = {
    YYYY: String(Y),
    yyyy: String(Y),
    YY: String(Y).slice(-2),
    MM: pad2(M),
    M: String(M),
    DD: pad2(D),
    D: String(D),
    HH: pad2(H),
    H: String(H),
    mm: pad2(m),
    m: String(m),
    ss: pad2(s),
    s: String(s),
  };

  return pattern.replace(/YYYY|yyyy|YY|MM|M|DD|D|HH|H|mm|m|ss|s/g, (t) => tokens[t]);
}

const execute: NodeExecutor = async (node, input) => {
  const data = DateTimeNodeDataSchema.parse(node.data);
  const now = new Date();

  const fmt = resolveInput(input, data, 'format') as string | undefined;

  return {
    iso: now.toISOString(),
    timestamp: now.getTime(),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
    formatted: fmt ? formatDate(now, fmt) : now.toISOString(),
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
      { id: 'formatted', type: FlowDataType.STRING },
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

import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { StringToNumberNode } from './StringToNumberNode.js';

export const StringToNumberNodeDataSchema = z.object({
  _version: z.number().optional(),
});
export type StringToNumberNodeData = z.infer<typeof StringToNumberNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const value = input.string;
  if (value === undefined || value === null) {
    throw new Error('Input string is missing.');
  }
  const num = parseFloat(String(value));
  if (isNaN(num)) {
    throw new Error(`'${value}' cannot be converted to a number.`);
  }
  return { result: num };
};

export const stringToNumberNodeDefinition: NodeDefinition<StringToNumberNodeData> = {
  type: 'stringToNumberNode',
  label: 'String To Number',
  category: 'Utility',
  component: StringToNumberNode,
  dataSchema: StringToNumberNodeDataSchema,
  currentVersion: 1,
  initialData: {},
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'string', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.NUMBER },
    ],
  },
  execute,
};

registrator.register(stringToNumberNodeDefinition);

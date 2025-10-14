import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { NumberNode } from './NumberNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const NumberNodeDataSchema = z.object({
  value: z.number(),
  _version: z.number().optional(),
});
export type NumberNodeData = z.infer<typeof NumberNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = NumberNodeDataSchema.parse(node.data);
  const value = resolveInput(input, data, 'value');
  return { value: Number(value) };
};

export const numberNodeDefinition: NodeDefinition<NumberNodeData> = {
  type: 'numberNode',
  label: 'Number',
  category: 'Input',
  component: NumberNode,
  dataSchema: NumberNodeDataSchema,
  currentVersion: 1,
  initialData: { value: 123 },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.ANY },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.NUMBER },
    ],
  },
  execute,
};

registrator.register(numberNodeDefinition);

import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { StringNode } from './StringNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const StringNodeDataSchema = z.object({
  value: z.string(),
  _version: z.number().optional(),
});
export type StringNodeData = z.infer<typeof StringNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = StringNodeDataSchema.parse(node.data);
  const value = resolveInput(input, data, 'value');
  return { value: String(value) };
};

export const stringNodeDefinition: NodeDefinition<StringNodeData> = {
  type: 'stringNode',
  label: 'String',
  category: 'Input',
  component: StringNode,
  dataSchema: StringNodeDataSchema,
  currentVersion: 1,
  initialData: { value: 'hello' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.ANY },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.STRING },
    ],
  },
  execute,
};

registrator.register(stringNodeDefinition);

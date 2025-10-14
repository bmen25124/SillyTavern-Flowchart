import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { BooleanNode } from './BooleanNode.js';

export const BooleanNodeDataSchema = z.object({
  value: z.boolean().default(false),
  _version: z.number().optional(),
});
export type BooleanNodeData = z.infer<typeof BooleanNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = BooleanNodeDataSchema.parse(node.data);
  const value = resolveInput(input, data, 'value');
  // Coerce any input into a boolean using standard JavaScript rules.
  // e.g., 0, "", null, undefined -> false; non-empty strings, numbers != 0 -> true
  return { value: Boolean(value) };
};

export const booleanNodeDefinition: NodeDefinition<BooleanNodeData> = {
  type: 'booleanNode',
  label: 'Boolean',
  category: 'Input',
  component: BooleanNode,
  dataSchema: BooleanNodeDataSchema,
  currentVersion: 1,
  initialData: { value: false },
  handles: {
    inputs: [{ id: 'value', type: FlowDataType.ANY }],
    outputs: [{ id: 'value', type: FlowDataType.BOOLEAN }],
  },
  execute,
};

registrator.register(booleanNodeDefinition);

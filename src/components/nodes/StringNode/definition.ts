import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STTextarea } from 'sillytavern-utils-lib/components/react';

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
  component: DataDrivenNode,
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
  meta: {
    fields: [createFieldConfig({ id: 'value', label: 'Value', component: STTextarea, props: { rows: 2 } })],
  },
};

registrator.register(stringNodeDefinition);

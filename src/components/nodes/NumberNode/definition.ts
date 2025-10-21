import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STInput } from 'sillytavern-utils-lib/components';
import React from 'react';

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
  component: DataDrivenNode,
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
  meta: {
    fields: [
      createFieldConfig({
        id: 'value',
        label: 'Value',
        component: STInput,
        props: { type: 'number' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) =>
          e.target.value === '' ? 0 : Number(e.target.value),
      }),
    ],
  },
};

registrator.register(numberNodeDefinition);

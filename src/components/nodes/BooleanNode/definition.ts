import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STSelect } from 'sillytavern-utils-lib/components';
import React from 'react';

export const BooleanNodeDataSchema = z.object({
  value: z.boolean().default(false),
  _version: z.number().optional(),
});
export type BooleanNodeData = z.infer<typeof BooleanNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = BooleanNodeDataSchema.parse(node.data);
  const value = resolveInput(input, data, 'value');
  return { value: Boolean(value) };
};

export const booleanNodeDefinition: NodeDefinition<BooleanNodeData> = {
  type: 'booleanNode',
  label: 'Boolean',
  category: 'Input',
  component: DataDrivenNode,
  dataSchema: BooleanNodeDataSchema,
  currentVersion: 1,
  initialData: { value: false },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.ANY },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.BOOLEAN },
    ],
  },
  execute,
  meta: {
    fields: [
      createFieldConfig({
        id: 'value',
        label: 'Value',
        component: STSelect,
        options: [
          { value: 'true', label: 'True' },
          { value: 'false', label: 'False' },
        ],
        getValueFromEvent: (e: React.ChangeEvent<HTMLSelectElement>) => e.target.value === 'true',
        formatValue: (value: boolean) => String(value),
      }),
    ],
  },
};

registrator.register(booleanNodeDefinition);

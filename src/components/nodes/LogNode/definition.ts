import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STInput } from 'sillytavern-utils-lib/components/react';

export const LogNodeDataSchema = z.object({
  prefix: z.string().default(''),
  _version: z.number().optional(),
});
export type LogNodeData = z.infer<typeof LogNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = LogNodeDataSchema.parse(node.data);
  const prefix = resolveInput(input, data, 'prefix');
  console.log(prefix, input.value);
  // Returns void. The runner handles the passthrough automatically.
};

export const logNodeDefinition: NodeDefinition<LogNodeData> = {
  type: 'logNode',
  label: 'Log',
  category: 'Utility',
  component: DataDrivenNode,
  dataSchema: LogNodeDataSchema,
  currentVersion: 1,
  initialData: { prefix: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.ANY },
      { id: 'prefix', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  execute,
  meta: {
    fields: [
      createFieldConfig({
        id: 'prefix',
        label: 'Log Prefix',
        component: STInput,
        props: { placeholder: 'Prefix for the log message', type: 'text' },
      }),
    ],
  },
};

registrator.register(logNodeDefinition);

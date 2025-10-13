import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { ManualTriggerNode } from './ManualTriggerNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

export const ManualTriggerNodeDataSchema = z.object({
  payload: z.string().default('{}'),
  _version: z.number().optional(),
});
export type ManualTriggerNodeData = z.infer<typeof ManualTriggerNodeDataSchema>;

const execute: NodeExecutor = async (node) => {
  const data = ManualTriggerNodeDataSchema.parse(node.data);
  try {
    return JSON.parse(data.payload);
  } catch (e: any) {
    throw new Error(`Invalid JSON payload: ${e.message}`);
  }
};

export const manualTriggerNodeDefinition: NodeDefinition<ManualTriggerNodeData> = {
  type: 'manualTriggerNode',
  label: 'Manual Trigger',
  category: 'Trigger',
  component: ManualTriggerNode,
  dataSchema: ManualTriggerNodeDataSchema,
  currentVersion: 1,
  initialData: { payload: '{\n}' },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.OBJECT }] },
  execute,
};

registrator.register(manualTriggerNodeDefinition);

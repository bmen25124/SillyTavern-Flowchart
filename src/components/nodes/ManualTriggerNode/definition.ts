import { z } from 'zod';
import { Node } from '@xyflow/react';
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

function valueToZodSchema(value: any): z.ZodType {
  if (value === null || value === undefined) return z.any();
  switch (typeof value) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'object':
      if (Array.isArray(value)) {
        return z.array(value.length > 0 ? valueToZodSchema(value[0]) : z.any());
      }
      const shape: { [key: string]: z.ZodType } = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          shape[key] = valueToZodSchema(value[key]);
        }
      }
      return z.object(shape);
    default:
      return z.any();
  }
}

function valueToFlowType(value: any): FlowDataType {
  if (value === null || value === undefined) return FlowDataType.ANY;
  switch (typeof value) {
    case 'string':
      return FlowDataType.STRING;
    case 'number':
      return FlowDataType.NUMBER;
    case 'boolean':
      return FlowDataType.BOOLEAN;
    case 'object':
      return FlowDataType.OBJECT; // Includes arrays
    default:
      return FlowDataType.ANY;
  }
}

const execute: NodeExecutor = async (node) => {
  const data = ManualTriggerNodeDataSchema.parse(node.data);
  try {
    const payload = JSON.parse(data.payload);
    if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
      return { result: payload, ...payload };
    }
    return { result: payload };
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
  initialData: { payload: '{\n  "key": "value"\n}' },
  handles: { inputs: [], outputs: [] },
  execute,
  getDynamicHandles: (node: Node<ManualTriggerNodeData>) => {
    try {
      const payload = JSON.parse(node.data.payload);
      const payloadType = valueToFlowType(payload);
      const payloadSchema = valueToZodSchema(payload);

      const outputs = [{ id: 'result', type: payloadType, schema: payloadSchema }];

      if (payloadType === FlowDataType.OBJECT && !Array.isArray(payload)) {
        for (const key in payload) {
          if (Object.prototype.hasOwnProperty.call(payload, key)) {
            outputs.push({
              id: key,
              type: valueToFlowType(payload[key]),
              schema: valueToZodSchema(payload[key]),
            });
          }
        }
      }

      return { inputs: [], outputs };
    } catch (e) {
      return { inputs: [], outputs: [{ id: 'result', type: FlowDataType.ANY }] };
    }
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'output') {
      try {
        const payload = JSON.parse((node.data as ManualTriggerNodeData).payload);
        if (handleId === 'result') return valueToFlowType(payload);
        if (typeof payload === 'object' && payload !== null && !Array.isArray(payload) && handleId) {
          return valueToFlowType(payload[handleId]);
        }
      } catch (e) {
        return FlowDataType.ANY;
      }
    }
    return undefined;
  },
};

registrator.register(manualTriggerNodeDefinition);

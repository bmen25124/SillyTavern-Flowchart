import { z } from 'zod';
import { Node } from '@xyflow/react';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { ManualTriggerNode } from './ManualTriggerNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveSchemaFromHandle, valueToZodSchema } from '../../../utils/schema-builder.js';
import { valueToFlowType, zodTypeToFlowType } from '../../../utils/type-mapping.js';
import { createDynamicOutputHandlesForSchema } from '../../../utils/handle-logic.js';

export const ManualTriggerNodeDataSchema = z.object({
  payload: z.string().default('{}'),
  _version: z.number().optional(),
});
export type ManualTriggerNodeData = z.infer<typeof ManualTriggerNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  // If called as a sub-flow, `input` will contain the parameters.
  if (Object.keys(input).length > 0) {
    if (typeof input === 'object' && input !== null) {
      return { ...input, result: input };
    }
    return { result: input };
  }

  // Fallback to static payload for manual runs.
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
  currentVersion: 2,
  initialData: { payload: '{\n  "key": "value"\n}' },
  handles: {
    inputs: [{ id: 'schema', type: FlowDataType.SCHEMA }],
    outputs: [],
  },
  execute,
  getDynamicHandles: (node: Node<ManualTriggerNodeData>, allNodes, allEdges) => {
    const connectedSchema = resolveSchemaFromHandle(node, allNodes, allEdges, 'schema');

    // If a schema is connected, use it to generate outputs.
    if (connectedSchema) {
      const propertyHandles = createDynamicOutputHandlesForSchema(connectedSchema);
      const resultHandle = { id: 'result', type: zodTypeToFlowType(connectedSchema), schema: connectedSchema };
      return { inputs: [], outputs: [resultHandle, ...propertyHandles] };
    }

    // Fallback to old behavior: infer from the static JSON payload for manual runs.
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
  getHandleType: ({ handleId, handleDirection, node, nodes, edges }) => {
    if (handleDirection === 'input' && handleId === 'schema') {
      return FlowDataType.SCHEMA;
    }

    if (handleDirection === 'output') {
      const connectedSchema = resolveSchemaFromHandle(node, nodes, edges, 'schema');
      if (connectedSchema) {
        if (handleId === 'result') return zodTypeToFlowType(connectedSchema);
        if (connectedSchema instanceof z.ZodObject && handleId && connectedSchema.shape[handleId]) {
          return zodTypeToFlowType(connectedSchema.shape[handleId]);
        }
      } else {
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
    }
    return undefined;
  },
};

registrator.register(manualTriggerNodeDefinition);

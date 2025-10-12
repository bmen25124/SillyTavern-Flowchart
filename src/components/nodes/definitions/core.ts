import {
  FlowDataType,
  ManualTriggerNodeData,
  ManualTriggerNodeDataSchema,
  TriggerNodeData,
  TriggerNodeDataSchema,
  EventNameParameters,
} from '../../../flow-types.js';
import { ManualTriggerNode } from '../ManualTriggerNode.js';
import { TriggerNode } from '../TriggerNode.js';
import { NodeDefinition } from './types.js';
import { EventNames } from 'sillytavern-utils-lib/types';
import { z } from 'zod';

function zodTypeToFlowType(type: z.ZodType): FlowDataType {
  if (type instanceof z.ZodNumber) return FlowDataType.NUMBER;
  if (type instanceof z.ZodString) return FlowDataType.STRING;
  if (type instanceof z.ZodBoolean) return FlowDataType.BOOLEAN;
  return FlowDataType.ANY;
}

export const triggerNodeDefinition: NodeDefinition<TriggerNodeData> = {
  type: 'triggerNode',
  label: 'Event Trigger',
  category: 'Trigger',
  component: TriggerNode,
  dataSchema: TriggerNodeDataSchema,
  initialData: { selectedEventType: EventNames.USER_MESSAGE_RENDERED },
  handles: {
    inputs: [],
    outputs: [], // Outputs are dynamic
  },
  getDynamicHandles: (data) => {
    const eventParams = EventNameParameters[data.selectedEventType];
    if (!eventParams) return { inputs: [], outputs: [] };
    const outputs = Object.keys(eventParams).map((paramName) => ({
      id: paramName,
      type: zodTypeToFlowType(eventParams[paramName]),
    }));
    return { inputs: [], outputs };
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'output') {
      const { selectedEventType } = node.data as TriggerNodeData;
      const eventParams = EventNameParameters[selectedEventType];
      if (eventParams && handleId && eventParams[handleId]) {
        return zodTypeToFlowType(eventParams[handleId]);
      }
    }
    return undefined;
  },
};

export const manualTriggerNodeDefinition: NodeDefinition<ManualTriggerNodeData> = {
  type: 'manualTriggerNode',
  label: 'Manual Trigger',
  category: 'Trigger',
  component: ManualTriggerNode,
  dataSchema: ManualTriggerNodeDataSchema,
  initialData: { payload: '{\n  "name": "World"\n}' },
  handles: {
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.OBJECT }],
  },
};

import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { EventNameParameters, FlowDataType } from '../../../flow-types.js';
import { TriggerNode } from './TriggerNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { EventNames } from 'sillytavern-utils-lib/types';

export const TriggerNodeDataSchema = z.object({
  selectedEventType: z.string().refine((val) => Object.values(EventNames).includes(val as any), {
    message: 'Invalid event type',
  }),
  _version: z.number().optional(),
});
export type TriggerNodeData = z.infer<typeof TriggerNodeDataSchema>;

const execute: NodeExecutor = async (_node, input) => {
  return { ...input };
};

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
  currentVersion: 1,
  initialData: { selectedEventType: EventNames.USER_MESSAGE_RENDERED },
  handles: { inputs: [], outputs: [] },
  execute,
  getDynamicHandles: (node) => {
    const { data } = node;
    const eventParams = EventNameParameters[data.selectedEventType];
    if (!eventParams) return { inputs: [], outputs: [] };
    const outputs = Object.keys(eventParams).map((paramName) => ({
      id: paramName,
      type: zodTypeToFlowType(eventParams[paramName]),
      schema: eventParams[paramName],
    }));
    return { inputs: [], outputs };
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'output') {
      const { selectedEventType } = node.data as { selectedEventType: string };
      const eventParams = EventNameParameters[selectedEventType];
      if (eventParams && handleId && eventParams[handleId]) {
        return zodTypeToFlowType(eventParams[handleId]);
      }
    }
    return undefined;
  },
};

registrator.register(triggerNodeDefinition);

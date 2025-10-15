import { z } from 'zod';
import { NodeDefinition, HandleSpec } from '../definitions/types.js';
import { EventNameParameters, FlowDataType } from '../../../flow-types.js';
import { TriggerNode } from './TriggerNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { EventNames } from 'sillytavern-utils-lib/types';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';

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

export const triggerNodeDefinition: NodeDefinition<TriggerNodeData> = {
  type: 'triggerNode',
  label: 'Event Trigger',
  category: 'Trigger',
  component: TriggerNode,
  dataSchema: TriggerNodeDataSchema,
  currentVersion: 1,
  initialData: { selectedEventType: 'user_message_rendered' },
  handles: { inputs: [], outputs: [] },
  execute,
  getDynamicHandles: (node) => {
    const { data } = node;
    const eventParams = EventNameParameters[data.selectedEventType];
    let outputs: HandleSpec[];

    if (eventParams) {
      outputs = Object.keys(eventParams).map((paramName) => ({
        id: paramName,
        type: zodTypeToFlowType(eventParams[paramName]),
        schema: eventParams[paramName],
      }));
    } else {
      outputs = [
        { id: 'allArgs', type: FlowDataType.OBJECT, schema: z.array(z.any()) },
        { id: 'arg0', type: FlowDataType.ANY },
        { id: 'arg1', type: FlowDataType.ANY },
        { id: 'arg2', type: FlowDataType.ANY },
        { id: 'arg3', type: FlowDataType.ANY },
      ];
    }
    return { inputs: [], outputs: [{ id: 'main', type: FlowDataType.ANY }, ...outputs] };
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'output' && handleId) {
      if (handleId === 'main') return FlowDataType.ANY;
      const { selectedEventType } = node.data as { selectedEventType: string };
      const eventParams = EventNameParameters[selectedEventType];

      if (eventParams) {
        if (eventParams[handleId]) {
          return zodTypeToFlowType(eventParams[handleId]);
        }
      } else {
        if (handleId === 'allArgs') return FlowDataType.OBJECT;
        if (handleId.startsWith('arg')) return FlowDataType.ANY;
      }
    }
    return undefined;
  },
};

registrator.register(triggerNodeDefinition);

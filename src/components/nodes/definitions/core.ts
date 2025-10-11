import {
  ManualTriggerNodeData,
  ManualTriggerNodeDataSchema,
  TriggerNodeData,
  TriggerNodeDataSchema,
} from '../../../flow-types.js';
import { ManualTriggerNode } from '../ManualTriggerNode.js';
import { TriggerNode } from '../TriggerNode.js';
import { NodeDefinition } from './types.js';
import { FlowDataType } from '../../../flow-types.js';
import { EventNames } from 'sillytavern-utils-lib/types';

export const triggerNodeDefinition: NodeDefinition<TriggerNodeData> = {
  type: 'triggerNode',
  label: 'Event Trigger',
  category: 'Trigger',
  component: TriggerNode,
  dataSchema: TriggerNodeDataSchema,
  initialData: { selectedEventType: EventNames.USER_MESSAGE_RENDERED },
  handles: {
    inputs: [],
    outputs: [],
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

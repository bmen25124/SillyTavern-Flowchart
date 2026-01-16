import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STInput, STSelect } from 'sillytavern-utils-lib/components/react';
import React from 'react';

export const ToggleChatMessageVisibilityNodeDataSchema = z.object({
  startId: z.number().optional(),
  endId: z.number().optional(),
  visible: z.boolean().default(true),
  _version: z.number().optional(),
});
export type ToggleChatMessageVisibilityNodeData = z.infer<typeof ToggleChatMessageVisibilityNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = ToggleChatMessageVisibilityNodeDataSchema.parse(node.data);
  const startId = resolveInput(input, data, 'startId');
  const endId = resolveInput(input, data, 'endId') ?? startId; // Default end to start if not provided
  const visible = resolveInput(input, data, 'visible');

  if (startId === undefined) {
    throw new Error('Start Message ID is required.');
  }
  if (endId === undefined) {
    throw new Error('End Message ID is required.');
  }

  await dependencies.hideChatMessageRange(startId, endId, visible);
  // Returns void, passthrough is handled by runner.
};

export const toggleChatMessageVisibilityNodeDefinition: NodeDefinition<ToggleChatMessageVisibilityNodeData> = {
  type: 'toggleChatMessageVisibilityNode',
  label: 'Hide/Show Message (Context)',
  category: 'Chat',
  component: DataDrivenNode,
  dataSchema: ToggleChatMessageVisibilityNodeDataSchema,
  currentVersion: 1,
  initialData: { visible: false }, // Default to hiding
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'startId', type: FlowDataType.NUMBER },
      { id: 'endId', type: FlowDataType.NUMBER },
      { id: 'visible', type: FlowDataType.BOOLEAN },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  validate: combineValidators(createRequiredFieldValidator('startId', 'Start Message ID is required.')),
  execute,
  meta: {
    fields: [
      createFieldConfig({
        id: 'startId',
        label: 'Start Message ID',
        component: STInput,
        props: { type: 'number' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
      }),
      createFieldConfig({
        id: 'endId',
        label: 'End Message ID (Optional)',
        component: STInput,
        props: { type: 'number', placeholder: 'Defaults to Start ID' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) =>
          e.target.value === '' ? undefined : Number(e.target.value),
      }),
      createFieldConfig({
        id: 'visible',
        label: 'Action',
        component: STSelect,
        options: [
          { value: 'false', label: 'Hide' },
          { value: 'true', label: 'Show' },
        ],
        getValueFromEvent: (e: React.ChangeEvent<HTMLSelectElement>) => e.target.value === 'true',
        formatValue: (value: boolean) => String(value),
      }),
    ],
  },
};

registrator.register(toggleChatMessageVisibilityNodeDefinition);

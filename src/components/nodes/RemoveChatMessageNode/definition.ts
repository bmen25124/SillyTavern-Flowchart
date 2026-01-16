import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STInput } from 'sillytavern-utils-lib/components/react';
import React from 'react';

export const RemoveChatMessageNodeDataSchema = z.object({
  messageId: z.number().optional(),
  _version: z.number().optional(),
});
export type RemoveChatMessageNodeData = z.infer<typeof RemoveChatMessageNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = RemoveChatMessageNodeDataSchema.parse(node.data);
  const messageId = resolveInput(input, data, 'messageId');
  if (messageId === undefined) throw new Error('Message ID is required.');

  await dependencies.deleteMessage(messageId);
  // Returns void, passthrough is handled by runner.
};

export const removeChatMessageNodeDefinition: NodeDefinition<RemoveChatMessageNodeData> = {
  type: 'removeChatMessageNode',
  label: 'Remove Chat Message',
  category: 'Chat',
  component: DataDrivenNode,
  dataSchema: RemoveChatMessageNodeDataSchema,
  currentVersion: 1,
  initialData: {},
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'messageId', type: FlowDataType.NUMBER },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  validate: combineValidators(createRequiredFieldValidator('messageId', 'Message ID is required.')),
  execute,
  meta: {
    fields: [
      createFieldConfig({
        id: 'messageId',
        label: 'Message ID',
        component: STInput,
        props: { type: 'number' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value),
      }),
    ],
  },
};

registrator.register(removeChatMessageNodeDefinition);

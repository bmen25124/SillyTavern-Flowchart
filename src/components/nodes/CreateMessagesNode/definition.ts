import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STConnectionProfileSelect, STInput } from 'sillytavern-utils-lib/components/react';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';
import React from 'react';

export const CreateMessagesNodeDataSchema = z.object({
  profileId: z.string().optional(),
  startMessageId: z.number().optional(),
  endMessageId: z.number().optional(),
  ignoreCharacterFields: z.boolean().default(false),
  ignoreAuthorNote: z.boolean().default(false),
  ignoreWorldInfo: z.boolean().default(false),
  _version: z.number().optional(),
});
export type CreateMessagesNodeData = z.infer<typeof CreateMessagesNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = CreateMessagesNodeDataSchema.parse(node.data);
  const profileId = resolveInput(input, data, 'profileId');
  if (!profileId) throw new Error(`Profile ID not provided.`);

  const options = {
    startMessageId: resolveInput(input, data, 'startMessageId'),
    endMessageId: resolveInput(input, data, 'endMessageId'),
    ignoreCharacterFields: resolveInput(input, data, 'ignoreCharacterFields'),
    ignoreAuthorNote: resolveInput(input, data, 'ignoreAuthorNote'),
    ignoreWorldInfo: resolveInput(input, data, 'ignoreWorldInfo'),
  };

  const messages = await dependencies.getBaseMessagesForProfile(profileId, options);
  return { result: messages };
};

export const createMessagesNodeDefinition: NodeDefinition<CreateMessagesNodeData> = {
  type: 'createMessagesNode',
  label: 'Create Messages',
  category: 'API Request',
  component: DataDrivenNode,
  dataSchema: CreateMessagesNodeDataSchema,
  currentVersion: 1,
  initialData: {
    profileId: '',
    ignoreCharacterFields: false,
    ignoreAuthorNote: false,
    ignoreWorldInfo: false,
  },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
      { id: 'startMessageId', type: FlowDataType.NUMBER },
      { id: 'endMessageId', type: FlowDataType.NUMBER },
      { id: 'ignoreCharacterFields', type: FlowDataType.BOOLEAN },
      { id: 'ignoreAuthorNote', type: FlowDataType.BOOLEAN },
      { id: 'ignoreWorldInfo', type: FlowDataType.BOOLEAN },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.MESSAGES },
    ],
  },
  validate: combineValidators(createRequiredFieldValidator('profileId', 'Connection Profile is required.')),
  execute,
  meta: {
    fields: (data: CreateMessagesNodeData) => [
      createFieldConfig({
        id: 'profileId',
        label: 'Connection Profile',
        component: STConnectionProfileSelect,
        props: {
          initialSelectedProfileId: data?.profileId,
        },
        customChangeHandler: (
          profile: ConnectionProfile | undefined,
          { nodeId, updateNodeData }: { nodeId: string; updateNodeData: (id: string, data: object) => void },
        ) => {
          updateNodeData(nodeId, { profileId: profile?.id || '' });
        },
      }),
      createFieldConfig({
        id: 'startMessageId',
        label: 'Start Message ID (Optional)',
        component: STInput,
        props: { type: 'number' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) =>
          e.target.value === '' ? undefined : Number(e.target.value),
      }),
      createFieldConfig({
        id: 'endMessageId',
        label: 'End Message ID (Optional)',
        component: STInput,
        props: { type: 'number' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) =>
          e.target.value === '' ? undefined : Number(e.target.value),
      }),
      createFieldConfig({
        id: 'ignoreCharacterFields',
        label: 'Ignore Character Fields',
        component: STInput,
        props: { type: 'checkbox' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => e.target.checked,
      }),
      createFieldConfig({
        id: 'ignoreAuthorNote',
        label: 'Ignore Author Note',
        component: STInput,
        props: { type: 'checkbox' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => e.target.checked,
      }),
      createFieldConfig({
        id: 'ignoreWorldInfo',
        label: 'Ignore World Info',
        component: STInput,
        props: { type: 'checkbox' },
        getValueFromEvent: (e: React.ChangeEvent<HTMLInputElement>) => e.target.checked,
      }),
    ],
  },
};

registrator.register(createMessagesNodeDefinition);

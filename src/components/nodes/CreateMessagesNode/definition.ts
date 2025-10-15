import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { CreateMessagesNode } from './CreateMessagesNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';

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
  component: CreateMessagesNode,
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
};

registrator.register(createMessagesNodeDefinition);

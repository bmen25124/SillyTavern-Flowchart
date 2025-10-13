import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { CreateMessagesNode } from './CreateMessagesNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const CreateMessagesNodeDataSchema = z.object({
  profileId: z.string().default(''),
  lastMessageId: z.number().optional(),
  _version: z.number().optional(),
});
export type CreateMessagesNodeData = z.infer<typeof CreateMessagesNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = CreateMessagesNodeDataSchema.parse(node.data);
  const profileId = resolveInput(input, data, 'profileId');
  const lastMessageId = resolveInput(input, data, 'lastMessageId');

  if (!profileId) throw new Error(`Profile ID not provided.`);

  return dependencies.getBaseMessagesForProfile(profileId, lastMessageId);
};

export const createMessagesNodeDefinition: NodeDefinition<CreateMessagesNodeData> = {
  type: 'createMessagesNode',
  label: 'Create Messages',
  category: 'API Request',
  component: CreateMessagesNode,
  dataSchema: CreateMessagesNodeDataSchema,
  currentVersion: 1,
  initialData: { profileId: '' },
  handles: {
    inputs: [
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
      { id: 'lastMessageId', type: FlowDataType.NUMBER },
    ],
    outputs: [{ id: null, type: FlowDataType.MESSAGES }],
  },
  execute,
};

registrator.register(createMessagesNodeDefinition);

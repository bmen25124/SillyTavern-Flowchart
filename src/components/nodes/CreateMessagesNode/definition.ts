import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, CreateMessagesNodeDataSchema } from '../../../flow-types.js';
import { CreateMessagesNode } from './CreateMessagesNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const resolveInput = <T extends object, K extends keyof T>(input: Record<string, any>, staticData: T, key: K): T[K] =>
  input[key as string] ?? staticData[key];

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = CreateMessagesNodeDataSchema.parse(node.data);
  const profileId = resolveInput(input, data, 'profileId');
  const lastMessageId = resolveInput(input, data, 'lastMessageId');

  if (!profileId) throw new Error(`Profile ID not provided.`);

  return dependencies.getBaseMessagesForProfile(profileId, lastMessageId);
};

export const createMessagesNodeDefinition: NodeDefinition = {
  type: 'createMessagesNode',
  label: 'Create Messages',
  category: 'API Request',
  component: CreateMessagesNode,
  dataSchema: CreateMessagesNodeDataSchema,
  currentVersion: 1,
  initialData: { profileId: '', _version: 1 },
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

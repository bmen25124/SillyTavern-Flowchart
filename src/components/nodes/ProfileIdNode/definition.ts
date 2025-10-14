import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { ProfileIdNode } from './ProfileIdNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const ProfileIdNodeDataSchema = z.object({
  profileId: z.string().default(''),
  _version: z.number().optional(),
});
export type ProfileIdNodeData = z.infer<typeof ProfileIdNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = ProfileIdNodeDataSchema.parse(node.data);
  const connectedValue = resolveInput(input, data, 'profileId');

  if (connectedValue !== undefined && connectedValue !== null && String(connectedValue).trim() !== '') {
    return { profileId: String(connectedValue) };
  }

  return { profileId: data.profileId };
};

export const profileIdNodeDefinition: NodeDefinition<ProfileIdNodeData> = {
  type: 'profileIdNode',
  label: 'Profile ID',
  category: 'Input',
  component: ProfileIdNode,
  dataSchema: ProfileIdNodeDataSchema,
  currentVersion: 1,
  initialData: { profileId: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'profileId', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
    ],
  },
  execute,
};

registrator.register(profileIdNodeDefinition);

import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, ProfileIdNodeDataSchema } from '../../../flow-types.js';
import { ProfileIdNode } from './ProfileIdNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const execute: NodeExecutor = async (node, input) => {
  const data = ProfileIdNodeDataSchema.parse(node.data);

  let resolvedId: string | undefined;
  if (typeof input === 'string') {
    resolvedId = input;
  } else if (typeof input === 'object' && input !== null) {
    resolvedId = input.profileId ?? input.value;
  }

  return resolvedId && typeof resolvedId === 'string' ? resolvedId : data.profileId;
};

export const profileIdNodeDefinition: NodeDefinition = {
  type: 'profileIdNode',
  label: 'Profile ID',
  category: 'Input',
  component: ProfileIdNode,
  dataSchema: ProfileIdNodeDataSchema,
  currentVersion: 1,
  initialData: { profileId: '', _version: 1 },
  handles: {
    inputs: [{ id: null, type: FlowDataType.ANY }],
    outputs: [{ id: null, type: FlowDataType.PROFILE_ID }],
  },
  execute,
};

registrator.register(profileIdNodeDefinition);

import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STConnectionProfileSelect } from 'sillytavern-utils-lib/components/react';
import { ConnectionProfile } from 'sillytavern-utils-lib/types/profiles';

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
  component: DataDrivenNode,
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
  meta: {
    fields: (data: ProfileIdNodeData) => [
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
    ],
  },
};

registrator.register(profileIdNodeDefinition);

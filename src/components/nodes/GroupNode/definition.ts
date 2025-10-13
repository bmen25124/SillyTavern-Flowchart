import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { GroupNode } from './GroupNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

export const GroupNodeDataSchema = z.object({
  label: z.string().default('Group'),
  _version: z.number().optional(),
});
export type GroupNodeData = z.infer<typeof GroupNodeDataSchema>;

const execute: NodeExecutor = async () => {
  return {}; // Group nodes do nothing at runtime
};

export const groupNodeDefinition: NodeDefinition<GroupNodeData> = {
  type: 'groupNode',
  label: 'Group',
  category: 'Utility',
  component: GroupNode,
  dataSchema: GroupNodeDataSchema,
  currentVersion: 1,
  initialData: { label: 'Group' },
  handles: { inputs: [], outputs: [] },
  execute,
};

registrator.register(groupNodeDefinition);

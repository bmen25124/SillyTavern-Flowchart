import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { CreateLorebookNode } from './CreateLorebookNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const CreateLorebookNodeDataSchema = z.object({
  worldName: z.string().optional(),
  _version: z.number().optional(),
});
export type CreateLorebookNodeData = z.infer<typeof CreateLorebookNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = CreateLorebookNodeDataSchema.parse(node.data);
  const worldName = resolveInput(input, data, 'worldName');
  if (!worldName) throw new Error(`World name is required.`);

  const success = await dependencies.st_createNewWorldInfo(worldName);
  if (!success) throw new Error(`Failed to create lorebook "${worldName}". It might already exist.`);
  return worldName;
};

export const createLorebookNodeDefinition: NodeDefinition<CreateLorebookNodeData> = {
  type: 'createLorebookNode',
  label: 'Create Lorebook',
  category: 'Lorebook',
  component: CreateLorebookNode,
  dataSchema: CreateLorebookNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: 'My Lorebook' },
  handles: {
    inputs: [{ id: 'worldName', type: FlowDataType.STRING }],
    outputs: [{ id: null, type: FlowDataType.STRING }],
  },
  execute,
};

registrator.register(createLorebookNodeDefinition);

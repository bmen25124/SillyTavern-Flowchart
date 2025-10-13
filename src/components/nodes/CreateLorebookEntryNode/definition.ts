import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { CreateLorebookEntryNode } from './CreateLorebookEntryNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { WIEntrySchema } from '../../../schemas.js';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import { resolveInput } from '../../../utils/node-logic.js';

export const CreateLorebookEntryNodeDataSchema = z.object({
  worldName: z.string().optional(),
  key: z.string().optional(), // comma-separated
  content: z.string().optional(),
  comment: z.string().optional(),
  _version: z.number().optional(),
});
export type CreateLorebookEntryNodeData = z.infer<typeof CreateLorebookEntryNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = CreateLorebookEntryNodeDataSchema.parse(node.data);
  const worldName = resolveInput(input, data, 'worldName');
  const keys = resolveInput(input, data, 'key') ?? '';
  if (!worldName) throw new Error('World name is required.');
  if (!keys) throw new Error('Key(s) are required.');

  const newEntry: WIEntry = {
    uid: -1, // SillyTavern will assign a new UID
    key: keys.split(',').map((k: string) => k.trim()),
    content: resolveInput(input, data, 'content') ?? '',
    comment: resolveInput(input, data, 'comment') ?? '',
    disable: false,
    keysecondary: [],
  };

  const result = await dependencies.applyWorldInfoEntry({
    entry: newEntry,
    selectedWorldName: worldName,
    operation: 'add',
  });
  return result.entry;
};

export const createLorebookEntryNodeDefinition: NodeDefinition<CreateLorebookEntryNodeData> = {
  type: 'createLorebookEntryNode',
  label: 'Create Lorebook Entry',
  category: 'Lorebook',
  component: CreateLorebookEntryNode,
  dataSchema: CreateLorebookEntryNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: '', key: '', content: '', comment: '' },
  handles: {
    inputs: [
      { id: 'worldName', type: FlowDataType.STRING },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
    ],
    outputs: [{ id: null, type: FlowDataType.OBJECT, schema: WIEntrySchema }],
  },
  execute,
};

registrator.register(createLorebookEntryNodeDefinition);

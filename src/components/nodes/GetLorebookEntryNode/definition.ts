import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, GetLorebookEntryNodeDataSchema } from '../../../flow-types.js';
import { GetLorebookEntryNode } from './GetLorebookEntryNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { WIEntrySchema } from '../../../schemas.js';

const resolveInput = <T extends object, K extends keyof T>(input: Record<string, any>, staticData: T, key: K): T[K] =>
  input[key as string] ?? staticData[key];

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = GetLorebookEntryNodeDataSchema.parse(node.data);
  const worldName = resolveInput(input, data, 'worldName');
  const entryUid = resolveInput(input, data, 'entryUid');
  if (!worldName) throw new Error('World name is required.');
  if (entryUid === undefined) throw new Error('Entry UID is required.');

  const allWorlds = await dependencies.getWorldInfos(['all']);
  const world = allWorlds[worldName];
  if (!world) throw new Error(`Lorebook "${worldName}" not found.`);

  const entry = world.find((e) => e.uid === entryUid);
  if (!entry) throw new Error(`Entry with UID "${entryUid}" not found in "${worldName}".`);

  return { entry, key: entry.key.join(', '), content: entry.content, comment: entry.comment };
};

export const getLorebookEntryNodeDefinition: NodeDefinition = {
  type: 'getLorebookEntryNode',
  label: 'Get Lorebook Entry',
  category: 'Lorebook',
  component: GetLorebookEntryNode,
  dataSchema: GetLorebookEntryNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: '', entryUid: undefined, _version: 1 },
  handles: {
    inputs: [
      { id: 'worldName', type: FlowDataType.STRING },
      { id: 'entryUid', type: FlowDataType.NUMBER },
    ],
    outputs: [
      { id: 'entry', type: FlowDataType.OBJECT, schema: WIEntrySchema },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
    ],
  },
  execute,
};

registrator.register(getLorebookEntryNodeDefinition);

import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, GetLorebookNodeDataSchema } from '../../../flow-types.js';
import { GetLorebookNode } from './GetLorebookNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { WIEntryListSchema } from '../../../schemas.js';

const resolveInput = <T extends object, K extends keyof T>(input: Record<string, any>, staticData: T, key: K): T[K] =>
  input[key as string] ?? staticData[key];

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = GetLorebookNodeDataSchema.parse(node.data);
  const worldName = resolveInput(input, data, 'worldName');
  if (!worldName) throw new Error('World name is required.');

  const allWorlds = await dependencies.getWorldInfos(['all']);
  const world = allWorlds[worldName];
  if (!world) throw new Error(`Lorebook "${worldName}" not found.`);
  return { entries: world };
};

export const getLorebookNodeDefinition: NodeDefinition = {
  type: 'getLorebookNode',
  label: 'Get Lorebook',
  category: 'Lorebook',
  component: GetLorebookNode,
  dataSchema: GetLorebookNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: '', _version: 1 },
  handles: {
    inputs: [{ id: 'worldName', type: FlowDataType.STRING }],
    outputs: [{ id: 'entries', type: FlowDataType.OBJECT, schema: WIEntryListSchema }],
  },
  execute,
};

registrator.register(getLorebookNodeDefinition);

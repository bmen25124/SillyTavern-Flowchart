import { NodeDefinition } from '../definitions/types.js';
import { GroupNodeDataSchema } from '../../../flow-types.js';
import { GroupNode } from './GroupNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const execute: NodeExecutor = async () => {
  return {}; // Group nodes do nothing at runtime
};

export const groupNodeDefinition: NodeDefinition = {
  type: 'groupNode',
  label: 'Group',
  category: 'Utility',
  component: GroupNode,
  dataSchema: GroupNodeDataSchema,
  currentVersion: 1,
  initialData: { label: 'Group', _version: 1 },
  handles: { inputs: [], outputs: [] },
  execute,
};

registrator.register(groupNodeDefinition);

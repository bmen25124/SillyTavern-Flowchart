import { baseNodeDefinitions } from './definitions.js';
import { nodeTypes as nodeComponents } from './components.js';
import { NodeDefinition } from './types.js';

export const allNodeDefinitions: NodeDefinition[] = baseNodeDefinitions.map((def) => ({
  ...def,
  // @ts-ignore
  component: nodeComponents[def.type],
}));

export const nodeDefinitionMap = new Map<string, NodeDefinition>(allNodeDefinitions.map((def) => [def.type, def]));

export const nodeTypes = nodeComponents;

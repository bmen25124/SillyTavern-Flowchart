import { IfNodeData, IfNodeDataSchema } from '../../../flow-types.js';
import { IfNode } from '../IfNode.js';
import { NodeDefinition } from './types.js';
import { FlowDataType } from '../../../flow-types.js';

export const ifNodeDefinition: NodeDefinition<IfNodeData> = {
  type: 'ifNode',
  label: 'If',
  category: 'Logic',
  component: IfNode,
  dataSchema: IfNodeDataSchema,
  initialData: { conditions: [{ id: crypto.randomUUID(), code: 'return true;' }] },
  handles: {
    inputs: [{ id: null, type: FlowDataType.ANY }],
    outputs: [{ id: 'false', type: FlowDataType.ANY }], // + dynamic condition handles
  },
};

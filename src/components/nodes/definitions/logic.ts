import { FlowDataType, IfNodeData, IfNodeDataSchema } from '../../../flow-types.js';
import { IfNode } from '../IfNode.js';
import { NodeDefinition } from './types.js';

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
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'output') {
      const isConditionHandle = (node.data as IfNodeData).conditions.some((c) => c.id === handleId);
      if (handleId === 'false' || isConditionHandle) {
        return FlowDataType.ANY;
      }
    }
    return undefined;
  },
};

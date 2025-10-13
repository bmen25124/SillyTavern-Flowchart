import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, IfNodeDataSchema } from '../../../flow-types.js';
import { IfNode } from './IfNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const execute: NodeExecutor = async (node, input, { dependencies, executionVariables }) => {
  const data = IfNodeDataSchema.parse(node.data);
  const variables = { ...Object.fromEntries(executionVariables) };

  for (const condition of data.conditions) {
    try {
      const func = new Function('input', 'variables', 'stContext', condition.code);
      if (func(input, variables, dependencies.getSillyTavernContext())) {
        return { activatedHandle: condition.id };
      }
    } catch (error: any) {
      throw new Error(`Error executing condition code: ${error.message}`);
    }
  }

  return { activatedHandle: 'false' };
};

export const ifNodeDefinition: NodeDefinition = {
  type: 'ifNode',
  label: 'If',
  category: 'Logic',
  component: IfNode,
  dataSchema: IfNodeDataSchema,
  currentVersion: 1,
  initialData: { conditions: [{ id: crypto.randomUUID(), code: 'return true;' }], _version: 1 },
  handles: {
    inputs: [{ id: null, type: FlowDataType.ANY }],
    outputs: [{ id: 'false', type: FlowDataType.ANY }],
  },
  execute,
  getDynamicHandles: (node) => ({
    inputs: [],
    // @ts-ignore
    outputs: node.data.conditions.map((c) => ({ id: c.id, type: FlowDataType.ANY })),
  }),
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'output') {
      // @ts-ignore
      const isConditionHandle = node.data.conditions.some((c) => c.id === handleId);
      if (handleId === 'false' || isConditionHandle) return FlowDataType.ANY;
    }
    return undefined;
  },
};

registrator.register(ifNodeDefinition);

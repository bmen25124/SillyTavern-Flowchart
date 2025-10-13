import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, CustomMessageNodeDataSchema, CustomMessageNodeData } from '../../../flow-types.js';
import { CustomMessageNode } from './CustomMessageNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const resolveInput = <T extends object, K extends keyof T>(input: Record<string, any>, staticData: T, key: K): T[K] =>
  input[key as string] ?? staticData[key];

const execute: NodeExecutor = async (node, input) => {
  const data = CustomMessageNodeDataSchema.parse(node.data);
  return data.messages.map(({ id, role, content }) => ({
    role: resolveInput(input, { [`${id}_role`]: role }, `${id}_role`),
    content: resolveInput(input, { [id]: content }, id),
  }));
};

export const customMessageNodeDefinition: NodeDefinition = {
  type: 'customMessageNode',
  label: 'Custom Message',
  category: 'API Request',
  component: CustomMessageNode,
  dataSchema: CustomMessageNodeDataSchema,
  currentVersion: 1,
  initialData: {
    messages: [{ id: crypto.randomUUID(), role: 'system', content: 'You are a helpful assistant.' }],
    _version: 1,
  },
  handles: { inputs: [], outputs: [{ id: null, type: FlowDataType.MESSAGES }] },
  execute,
  getDynamicHandles: (node) => ({
    // @ts-ignore
    inputs: node.data.messages.flatMap((m) => [
      { id: m.id, type: FlowDataType.STRING },
      { id: `${m.id}_role`, type: FlowDataType.STRING },
    ]),
    outputs: [],
  }),
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'input' && handleId) {
      const isRoleHandle = handleId.endsWith('_role');
      const msgId = isRoleHandle ? handleId.slice(0, -5) : handleId;
      if ((node.data as CustomMessageNodeData).messages.some((m) => m.id === msgId)) return FlowDataType.STRING;
    }
    return undefined;
  },
};

registrator.register(customMessageNodeDefinition);

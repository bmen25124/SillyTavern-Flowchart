import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { CustomMessageNode } from './CustomMessageNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const CustomMessageNodeDataSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    }),
  ),
  _version: z.number().optional(),
});
export type CustomMessageNodeData = z.infer<typeof CustomMessageNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = CustomMessageNodeDataSchema.parse(node.data);
  const messages = data.messages.map(({ id, role, content }) => ({
    role: resolveInput(input, { [`${id}_role`]: role }, `${id}_role`),
    content: resolveInput(input, { [id]: content }, id),
  }));
  return { result: messages };
};

export const customMessageNodeDefinition: NodeDefinition<CustomMessageNodeData> = {
  type: 'customMessageNode',
  label: 'Custom Message',
  category: 'API Request',
  component: CustomMessageNode,
  dataSchema: CustomMessageNodeDataSchema,
  currentVersion: 1,
  initialData: {
    messages: [{ id: crypto.randomUUID(), role: 'system', content: 'You are a helpful assistant.' }],
  },
  handles: {
    inputs: [{ id: 'main', type: FlowDataType.ANY }],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.MESSAGES },
    ],
  },
  execute,
  getDynamicHandles: (node) => ({
    inputs: (node.data.messages || []).flatMap((m) => [
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

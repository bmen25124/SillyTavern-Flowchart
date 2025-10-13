import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, SendChatMessageNodeDataSchema } from '../../../flow-types.js';
import { SendChatMessageNode } from './SendChatMessageNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

const resolveInput = <T extends object, K extends keyof T>(input: Record<string, any>, staticData: T, key: K): T[K] =>
  input[key as string] ?? staticData[key];

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = SendChatMessageNodeDataSchema.parse(node.data);
  const message = resolveInput(input, data, 'message');
  if (!message) throw new Error('Message content is required.');

  const role = resolveInput(input, data, 'role');
  const name = resolveInput(input, data, 'name');
  await dependencies.sendChatMessage(message, role, name);

  const newChatLength = dependencies.getSillyTavernContext().chat.length;
  return { messageId: newChatLength - 1 };
};

export const sendChatMessageNodeDefinition: NodeDefinition = {
  type: 'sendChatMessageNode',
  label: 'Send Chat Message',
  category: 'Chat',
  component: SendChatMessageNode,
  dataSchema: SendChatMessageNodeDataSchema,
  currentVersion: 1,
  initialData: { message: '', role: 'assistant', _version: 1 },
  handles: {
    inputs: [
      { id: 'message', type: FlowDataType.STRING },
      { id: 'role', type: FlowDataType.STRING },
      { id: 'name', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'messageId', type: FlowDataType.NUMBER }],
  },
  execute,
};

registrator.register(sendChatMessageNodeDefinition);

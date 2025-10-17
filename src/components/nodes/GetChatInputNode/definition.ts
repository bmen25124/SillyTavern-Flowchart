import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { GetChatInputNode } from './GetChatInputNode.js';

export const GetChatInputNodeDataSchema = z.object({
  _version: z.number().optional(),
});
export type GetChatInputNodeData = z.infer<typeof GetChatInputNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const value = dependencies.getChatInputValue();
  return { value };
};

export const getChatInputNodeDefinition: NodeDefinition<GetChatInputNodeData> = {
  type: 'getChatInputNode',
  label: 'Get Chat Input',
  category: 'Chat',
  component: GetChatInputNode,
  dataSchema: GetChatInputNodeDataSchema,
  currentVersion: 1,
  initialData: {},
  handles: {
    inputs: [{ id: 'main', type: FlowDataType.ANY }],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.STRING },
    ],
  },
  execute,
};

registrator.register(getChatInputNodeDefinition);

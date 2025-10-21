import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { SimpleDisplayNode } from '../SimpleDisplayNode.js';

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
  component: SimpleDisplayNode,
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
  meta: {
    description: 'Outputs current input text.',
  },
};

registrator.register(getChatInputNodeDefinition);

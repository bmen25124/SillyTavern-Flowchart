import { z } from 'zod';
import { st_echo } from 'sillytavern-utils-lib/config';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { NotificationNode } from './NotificationNode.js';

const NotificationTypeSchema = z.enum(['info', 'success', 'error', 'warning']);

export const NotificationNodeDataSchema = z.object({
  message: z.string().default(''),
  notificationType: NotificationTypeSchema.default('info'),
  _version: z.number().optional(),
});
export type NotificationNodeData = z.infer<typeof NotificationNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = NotificationNodeDataSchema.parse(node.data);
  const message = resolveInput(input, data, 'message');
  const notificationType = resolveInput(input, data, 'notificationType');

  if (!message) {
    // With passthrough, it's better not to throw an error if the message is empty.
    // Just pass it through silently.
    return { message };
  }

  const validatedType = NotificationTypeSchema.safeParse(notificationType);
  if (!validatedType.success) {
    st_echo('error', `Invalid notification type: ${notificationType}. Defaulting to 'info'.`);
  }

  st_echo(validatedType.data || 'info', message);

  // Passthrough the message
  return { message };
};

export const notificationNodeDefinition: NodeDefinition<NotificationNodeData> = {
  type: 'notificationNode',
  label: 'Notification',
  category: 'Utility',
  component: NotificationNode,
  dataSchema: NotificationNodeDataSchema,
  currentVersion: 1,
  initialData: { message: 'Hello!', notificationType: 'info' },
  handles: {
    inputs: [
      { id: 'message', type: FlowDataType.STRING },
      { id: 'notificationType', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'message', type: FlowDataType.STRING }],
  },
  execute,
  isPassthrough: true,
  passthroughHandleId: 'message',
};

registrator.register(notificationNodeDefinition);

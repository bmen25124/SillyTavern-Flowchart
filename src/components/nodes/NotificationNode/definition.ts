import { z } from 'zod';
import { st_echo } from 'sillytavern-utils-lib/config';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { notify } from '../../../utils/notify.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STSelect, STTextarea } from 'sillytavern-utils-lib/components';

const NotificationTypeSchema = z.enum(['info', 'success', 'error', 'warning']);

export const NotificationNodeDataSchema = z.object({
  message: z.string().optional(),
  notificationType: NotificationTypeSchema.default('info'),
  _version: z.number().optional(),
});
export type NotificationNodeData = z.infer<typeof NotificationNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = NotificationNodeDataSchema.parse(node.data);

  const message = resolveInput(input, data, 'message');
  const notificationType = resolveInput(input, data, 'notificationType');

  if (message) {
    const validatedType = NotificationTypeSchema.safeParse(notificationType);
    if (!validatedType.success) {
      notify('error', `Invalid notification type: ${notificationType}. Defaulting to 'info'.`, 'ui_action');
    }
    st_echo(validatedType.data || 'info', String(message));
  }

  // No return value, runner handles passthrough.
};

export const notificationNodeDefinition: NodeDefinition<NotificationNodeData> = {
  type: 'notificationNode',
  label: 'Notification',
  category: 'User Interaction',
  component: DataDrivenNode,
  dataSchema: NotificationNodeDataSchema,
  currentVersion: 1,
  initialData: { message: 'Hello!', notificationType: 'info' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'message', type: FlowDataType.STRING },
      { id: 'notificationType', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  validate: combineValidators(createRequiredFieldValidator('message', 'Message is required.')),
  execute,
  meta: {
    fields: [
      createFieldConfig({
        id: 'message',
        label: 'Message',
        component: STTextarea,
        props: { rows: 3 },
      }),
      createFieldConfig({
        id: 'notificationType',
        label: 'Type',
        component: STSelect,
        options: [
          { value: 'info', label: 'Info' },
          { value: 'success', label: 'Success' },
          { value: 'warning', label: 'Warning' },
          { value: 'error', label: 'Error' },
        ],
      }),
    ],
  },
};

registrator.register(notificationNodeDefinition);

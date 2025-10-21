import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { Edge } from '@xyflow/react';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STTextarea } from 'sillytavern-utils-lib/components';

export const ConfirmUserNodeDataSchema = z.object({
  message: z.string().optional(),
  _version: z.number().optional(),
});
export type ConfirmUserNodeData = z.infer<typeof ConfirmUserNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = ConfirmUserNodeDataSchema.parse(node.data);

  const message = resolveInput(input, data, 'message');
  if (!message) {
    throw new Error('Confirmation message is required.');
  }

  const result = await dependencies.confirmUser(message);
  return { activatedHandle: result ? 'true' : 'false' };
};

export const confirmUserNodeDefinition: NodeDefinition<ConfirmUserNodeData> = {
  type: 'confirmUserNode',
  label: 'Confirm With User',
  category: 'User Interaction',
  component: DataDrivenNode,
  dataSchema: ConfirmUserNodeDataSchema,
  currentVersion: 1,
  initialData: { message: 'Are you sure?' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'message', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'true', type: FlowDataType.ANY },
      { id: 'false', type: FlowDataType.ANY },
    ],
  },
  validate: combineValidators(createRequiredFieldValidator('message', 'Message is required.')),
  execute,
  determineEdgesToFollow: <T extends Edge>(output: any, outgoingEdges: T[]): T[] => {
    if (output?.activatedHandle) {
      return outgoingEdges.filter((edge) => edge.sourceHandle === output.activatedHandle);
    }
    return [];
  },
  meta: {
    fields: [
      createFieldConfig({
        id: 'message',
        label: 'Confirmation Message',
        component: STTextarea,
        props: { rows: 3 },
      }),
    ],
  },
};

registrator.register(confirmUserNodeDefinition);

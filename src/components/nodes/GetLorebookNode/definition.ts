import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { GetLorebookNode } from './GetLorebookNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { WIEntryListSchema } from '../../../schemas.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const GetLorebookNodeDataSchema = z.object({
  worldName: z.string().optional(),
  _version: z.number().optional(),
});
export type GetLorebookNodeData = z.infer<typeof GetLorebookNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = GetLorebookNodeDataSchema.parse(node.data);
  const worldName = resolveInput(input, data, 'worldName');
  if (!worldName) throw new Error('World name is required.');

  const allWorlds = await dependencies.getWorldInfos(['all']);
  const world = allWorlds[worldName];
  if (!world) throw new Error(`Lorebook "${worldName}" not found.`);
  return { entries: world };
};

export const getLorebookNodeDefinition: NodeDefinition<GetLorebookNodeData> = {
  type: 'getLorebookNode',
  label: 'Get Lorebook',
  category: 'Lorebook',
  component: GetLorebookNode,
  dataSchema: GetLorebookNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'worldName', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'entries', type: FlowDataType.OBJECT, schema: WIEntryListSchema },
    ],
  },
  validate: (node: Node<GetLorebookNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (!node.data.worldName && !edges.some((e) => e.target === node.id && e.targetHandle === 'worldName')) {
      issues.push({ fieldId: 'worldName', message: 'Lorebook Name is required.', severity: 'error' });
    }
    return issues;
  },
  execute,
};

registrator.register(getLorebookNodeDefinition);

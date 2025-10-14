import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { EditLorebookEntryNode } from './EditLorebookEntryNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { WIEntrySchema } from '../../../schemas.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const EditLorebookEntryNodeDataSchema = z.object({
  worldName: z.string().optional(),
  entryUid: z.number().optional(), // uid is used as an identifier
  key: z.string().optional(),
  content: z.string().optional(),
  comment: z.string().optional(), // new comment
  _version: z.number().optional(),
});
export type EditLorebookEntryNodeData = z.infer<typeof EditLorebookEntryNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = EditLorebookEntryNodeDataSchema.parse(node.data);
  const worldName = resolveInput(input, data, 'worldName');
  const entryUid = resolveInput(input, data, 'entryUid');
  if (!worldName) throw new Error('World name is required to find the entry.');
  if (entryUid === undefined) throw new Error('Entry UID is required to identify the entry to edit.');

  const allWorlds = await dependencies.getWorldInfos(['all']);
  const world = allWorlds[worldName];
  if (!world) throw new Error(`Lorebook "${worldName}" not found.`);

  const entryToEdit = world.find((entry) => entry.uid === entryUid);
  if (!entryToEdit) throw new Error(`Entry with UID "${entryUid}" not found in "${worldName}".`);

  const newKeys = resolveInput(input, data, 'key');
  if (newKeys) {
    entryToEdit.key = newKeys.split(',').map((k: string) => k.trim());
  }

  const newContent = resolveInput(input, data, 'content');
  if (newContent) {
    entryToEdit.content = newContent;
  }

  const newComment = resolveInput(input, data, 'comment');
  if (newComment) {
    entryToEdit.comment = newComment;
  }

  const result = await dependencies.applyWorldInfoEntry({
    entry: entryToEdit,
    selectedWorldName: worldName,
    operation: 'update',
  });
  return { result: result.entry };
};

export const editLorebookEntryNodeDefinition: NodeDefinition<EditLorebookEntryNodeData> = {
  type: 'editLorebookEntryNode',
  label: 'Edit Lorebook Entry',
  category: 'Lorebook',
  component: EditLorebookEntryNode,
  dataSchema: EditLorebookEntryNodeDataSchema,
  currentVersion: 1,
  initialData: { worldName: '', entryUid: undefined },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'worldName', type: FlowDataType.STRING },
      { id: 'entryUid', type: FlowDataType.NUMBER },
      { id: 'key', type: FlowDataType.STRING },
      { id: 'content', type: FlowDataType.STRING },
      { id: 'comment', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.OBJECT, schema: WIEntrySchema },
    ],
  },
  validate: (node: Node<EditLorebookEntryNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (!node.data.worldName && !edges.some((e) => e.target === node.id && e.targetHandle === 'worldName')) {
      issues.push({ fieldId: 'worldName', message: 'Lorebook Name is required.', severity: 'error' });
    }
    if (node.data.entryUid === undefined && !edges.some((e) => e.target === node.id && e.targetHandle === 'entryUid')) {
      issues.push({ fieldId: 'entryUid', message: 'Entry to Edit is required.', severity: 'error' });
    }
    return issues;
  },
  execute,
};

registrator.register(editLorebookEntryNodeDefinition);

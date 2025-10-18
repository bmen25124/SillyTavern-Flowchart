import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { NoteNode } from './NoteNode.js';

export const NoteNodeDataSchema = z.object({
  text: z.string().default(''),
  _version: z.number().optional(),
});
export type NoteNodeData = z.infer<typeof NoteNodeDataSchema>;

const execute: NodeExecutor = async () => {
  // A note does not have any executable logic.
};

export const noteNodeDefinition: NodeDefinition<NoteNodeData> = {
  type: 'noteNode',
  label: 'Note',
  category: 'Utility',
  component: NoteNode,
  dataSchema: NoteNodeDataSchema,
  currentVersion: 1,
  initialData: { text: '' },
  handles: {
    inputs: [],
    outputs: [],
  },
  execute,
  isVisual: true,
};

registrator.register(noteNodeDefinition);

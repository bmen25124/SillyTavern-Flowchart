import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import {
  PickCharacterNode,
  PickFlowNode,
  PickLorebookNode,
  PickMathOperationNode,
  PickPromptEngineeringModeNode,
  PickPromptNode,
  PickRandomModeNode,
  PickRegexModeNode,
  PickRegexScriptNode,
  PickStringToolsOperationNode,
  PickTypeConverterTargetNode,
} from './PickerNodes.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { PromptEngineeringMode } from '../../../config.js';

// Schemas
export const PickCharacterNodeDataSchema = z.object({
  characterAvatar: z.string().default(''),
  _version: z.number().optional(),
});
export type PickCharacterNodeData = z.infer<typeof PickCharacterNodeDataSchema>;

export const PickLorebookNodeDataSchema = z.object({
  worldName: z.string().default(''),
  _version: z.number().optional(),
});
export type PickLorebookNodeData = z.infer<typeof PickLorebookNodeDataSchema>;

export const PickPromptNodeDataSchema = z.object({
  promptName: z.string().default(''),
  _version: z.number().optional(),
});
export type PickPromptNodeData = z.infer<typeof PickPromptNodeDataSchema>;

export const PickRegexScriptNodeDataSchema = z.object({
  scriptId: z.string().default(''),
  _version: z.number().optional(),
});
export type PickRegexScriptNodeData = z.infer<typeof PickRegexScriptNodeDataSchema>;

export const PickMathOperationNodeDataSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'modulo']).default('add'),
  _version: z.number().optional(),
});
export type PickMathOperationNodeData = z.infer<typeof PickMathOperationNodeDataSchema>;

export const PickStringToolsOperationNodeDataSchema = z.object({
  operation: z.enum(['merge', 'split', 'join']).default('merge'),
  _version: z.number().optional(),
});
export type PickStringToolsOperationNodeData = z.infer<typeof PickStringToolsOperationNodeDataSchema>;

export const PickPromptEngineeringModeNodeDataSchema = z.object({
  mode: z.nativeEnum(PromptEngineeringMode).default(PromptEngineeringMode.NATIVE),
  _version: z.number().optional(),
});
export type PickPromptEngineeringModeNodeData = z.infer<typeof PickPromptEngineeringModeNodeDataSchema>;

export const PickRandomModeNodeDataSchema = z.object({
  mode: z.enum(['number', 'array']).default('number'),
  _version: z.number().optional(),
});
export type PickRandomModeNodeData = z.infer<typeof PickRandomModeNodeDataSchema>;

export const PickRegexModeNodeDataSchema = z.object({
  mode: z.enum(['sillytavern', 'custom']).default('sillytavern'),
  _version: z.number().optional(),
});
export type PickRegexModeNodeData = z.infer<typeof PickRegexModeNodeDataSchema>;

export const PickTypeConverterTargetNodeDataSchema = z.object({
  targetType: z.enum(['string', 'number', 'object', 'array']).default('string'),
  _version: z.number().optional(),
});
export type PickTypeConverterTargetNodeData = z.infer<typeof PickTypeConverterTargetNodeDataSchema>;

export const PickFlowNodeDataSchema = z.object({
  flowId: z.string().default(''),
  _version: z.number().optional(),
});
export type PickFlowNodeData = z.infer<typeof PickFlowNodeDataSchema>;

// Executors
const pickerExecutors: Record<string, NodeExecutor> = {
  pickCharacterNode: async (node) => ({ avatar: PickCharacterNodeDataSchema.parse(node.data).characterAvatar }),
  pickLorebookNode: async (node) => ({ name: PickLorebookNodeDataSchema.parse(node.data).worldName }),
  pickPromptNode: async (node) => ({ name: PickPromptNodeDataSchema.parse(node.data).promptName }),
  pickRegexScriptNode: async (node) => ({ id: PickRegexScriptNodeDataSchema.parse(node.data).scriptId }),
  pickMathOperationNode: async (node) => ({ operation: PickMathOperationNodeDataSchema.parse(node.data).operation }),
  pickStringToolsOperationNode: async (node) => ({
    operation: PickStringToolsOperationNodeDataSchema.parse(node.data).operation,
  }),
  pickPromptEngineeringModeNode: async (node) => ({
    mode: PickPromptEngineeringModeNodeDataSchema.parse(node.data).mode,
  }),
  pickRandomModeNode: async (node) => ({ mode: PickRandomModeNodeDataSchema.parse(node.data).mode }),
  pickRegexModeNode: async (node) => ({ mode: PickRegexModeNodeDataSchema.parse(node.data).mode }),
  pickTypeConverterTargetNode: async (node) => ({
    type: PickTypeConverterTargetNodeDataSchema.parse(node.data).targetType,
  }),
  pickFlowNode: async (node) => ({ flowId: PickFlowNodeDataSchema.parse(node.data).flowId }),
};

// Definitions
const definitions: NodeDefinition[] = [
  {
    type: 'pickCharacterNode',
    label: 'Pick Character',
    category: 'Picker',
    component: PickCharacterNode,
    dataSchema: PickCharacterNodeDataSchema,
    currentVersion: 1,
    initialData: { characterAvatar: '' },
    handles: { inputs: [], outputs: [{ id: 'avatar', type: FlowDataType.STRING }] },
    execute: pickerExecutors.pickCharacterNode,
  },
  {
    type: 'pickLorebookNode',
    label: 'Pick Lorebook',
    category: 'Picker',
    component: PickLorebookNode,
    dataSchema: PickLorebookNodeDataSchema,
    currentVersion: 1,
    initialData: { worldName: '' },
    handles: { inputs: [], outputs: [{ id: 'name', type: FlowDataType.STRING }] },
    execute: pickerExecutors.pickLorebookNode,
  },
  {
    type: 'pickPromptNode',
    label: 'Pick Prompt',
    category: 'Picker',
    component: PickPromptNode,
    dataSchema: PickPromptNodeDataSchema,
    currentVersion: 1,
    initialData: { promptName: '' },
    handles: { inputs: [], outputs: [{ id: 'name', type: FlowDataType.STRING }] },
    execute: pickerExecutors.pickPromptNode,
  },
  {
    type: 'pickRegexScriptNode',
    label: 'Pick Regex Script',
    category: 'Picker',
    component: PickRegexScriptNode,
    dataSchema: PickRegexScriptNodeDataSchema,
    currentVersion: 1,
    initialData: { scriptId: '' },
    handles: { inputs: [], outputs: [{ id: 'id', type: FlowDataType.STRING }] },
    execute: pickerExecutors.pickRegexScriptNode,
  },
  {
    type: 'pickMathOperationNode',
    label: 'Pick Math Operation',
    category: 'Picker',
    component: PickMathOperationNode,
    dataSchema: PickMathOperationNodeDataSchema,
    currentVersion: 1,
    initialData: { operation: 'add' },
    handles: { inputs: [], outputs: [{ id: 'operation', type: FlowDataType.STRING }] },
    execute: pickerExecutors.pickMathOperationNode,
  },
  {
    type: 'pickStringToolsOperationNode',
    label: 'Pick String Operation',
    category: 'Picker',
    component: PickStringToolsOperationNode,
    dataSchema: PickStringToolsOperationNodeDataSchema,
    currentVersion: 1,
    initialData: { operation: 'merge' },
    handles: { inputs: [], outputs: [{ id: 'operation', type: FlowDataType.STRING }] },
    execute: pickerExecutors.pickStringToolsOperationNode,
  },
  {
    type: 'pickPromptEngineeringModeNode',
    label: 'Pick Prompt Mode',
    category: 'Picker',
    component: PickPromptEngineeringModeNode,
    dataSchema: PickPromptEngineeringModeNodeDataSchema,
    currentVersion: 1,
    initialData: { mode: PromptEngineeringMode.NATIVE },
    handles: { inputs: [], outputs: [{ id: 'mode', type: FlowDataType.STRING }] },
    execute: pickerExecutors.pickPromptEngineeringModeNode,
  },
  {
    type: 'pickRandomModeNode',
    label: 'Pick Random Mode',
    category: 'Picker',
    component: PickRandomModeNode,
    dataSchema: PickRandomModeNodeDataSchema,
    currentVersion: 1,
    initialData: { mode: 'number' },
    handles: { inputs: [], outputs: [{ id: 'mode', type: FlowDataType.STRING }] },
    execute: pickerExecutors.pickRandomModeNode,
  },
  {
    type: 'pickRegexModeNode',
    label: 'Pick Regex Mode',
    category: 'Picker',
    component: PickRegexModeNode,
    dataSchema: PickRegexModeNodeDataSchema,
    currentVersion: 1,
    initialData: { mode: 'sillytavern' },
    handles: { inputs: [], outputs: [{ id: 'mode', type: FlowDataType.STRING }] },
    execute: pickerExecutors.pickRegexModeNode,
  },
  {
    type: 'pickTypeConverterTargetNode',
    label: 'Pick Conversion Type',
    category: 'Picker',
    component: PickTypeConverterTargetNode,
    dataSchema: PickTypeConverterTargetNodeDataSchema,
    currentVersion: 1,
    initialData: { targetType: 'string' },
    handles: { inputs: [], outputs: [{ id: 'type', type: FlowDataType.STRING }] },
    execute: pickerExecutors.pickTypeConverterTargetNode,
  },
  {
    type: 'pickFlowNode',
    label: 'Pick Flow',
    category: 'Picker',
    component: PickFlowNode,
    dataSchema: PickFlowNodeDataSchema,
    currentVersion: 1,
    initialData: { flowId: '' },
    handles: { inputs: [], outputs: [{ id: 'flowId', type: FlowDataType.STRING }] },
    execute: pickerExecutors.pickFlowNode,
  },
];

definitions.forEach((def) => registrator.register(def));

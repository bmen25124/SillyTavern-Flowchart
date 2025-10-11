import {
  GroupNodeData,
  GroupNodeDataSchema,
  HandlebarNodeData,
  HandlebarNodeDataSchema,
  LogNodeData,
  LogNodeDataSchema,
  MergeObjectsNodeData,
  MergeObjectsNodeDataSchema,
} from '../../../flow-types.js';
import { GroupNode } from '../GroupNode.js';
import { HandlebarNode } from '../HandlebarNode.js';
import { LogNode } from '../LogNode.js';
import { MergeObjectsNode } from '../MergeObjectsNode.js';
import { NodeDefinition } from './types.js';
import { FlowDataType } from '../../../flow-types.js';

export const logNodeDefinition: NodeDefinition<LogNodeData> = {
  type: 'logNode',
  label: 'Log',
  category: 'Utility',
  component: LogNode,
  dataSchema: LogNodeDataSchema,
  initialData: { prefix: 'Log:' },
  handles: {
    inputs: [{ id: null, type: FlowDataType.ANY }],
    outputs: [{ id: null, type: FlowDataType.ANY }],
  },
};

export const handlebarNodeDefinition: NodeDefinition<HandlebarNodeData> = {
  type: 'handlebarNode',
  label: 'Handlebar',
  category: 'Utility',
  component: HandlebarNode,
  dataSchema: HandlebarNodeDataSchema,
  initialData: { template: 'Hello, {{name}}!' },
  handles: {
    inputs: [
      { id: 'template', type: FlowDataType.STRING },
      { id: 'data', type: FlowDataType.OBJECT },
    ],
    outputs: [{ id: 'result', type: FlowDataType.STRING }],
  },
};

export const mergeObjectsNodeDefinition: NodeDefinition<MergeObjectsNodeData> = {
  type: 'mergeObjectsNode',
  label: 'Merge Objects',
  category: 'Utility',
  component: MergeObjectsNode,
  dataSchema: MergeObjectsNodeDataSchema,
  initialData: { inputCount: 2 },
  handles: {
    inputs: [], // Dynamic handles
    outputs: [{ id: null, type: FlowDataType.OBJECT }],
  },
};

export const groupNodeDefinition: NodeDefinition<GroupNodeData> = {
  type: 'groupNode',
  label: 'Group',
  category: 'Utility',
  component: GroupNode,
  dataSchema: GroupNodeDataSchema,
  initialData: { label: 'Group' },
  handles: {
    inputs: [],
    outputs: [],
  },
};

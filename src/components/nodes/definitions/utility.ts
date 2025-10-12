import {
  ExecuteJsNodeData,
  ExecuteJsNodeDataSchema,
  GroupNodeData,
  GroupNodeDataSchema,
  HandlebarNodeData,
  HandlebarNodeDataSchema,
  LogNodeData,
  LogNodeDataSchema,
  MergeObjectsNodeData,
  MergeObjectsNodeDataSchema,
  DateTimeNodeData,
  DateTimeNodeDataSchema,
  RandomNodeData,
  RandomNodeDataSchema,
  StringToolsNodeData,
  StringToolsNodeDataSchema,
  MathNodeData,
  MathNodeDataSchema,
  GetPromptNodeData,
  GetPromptNodeDataSchema,
  SetVariableNodeData,
  SetVariableNodeDataSchema,
  GetVariableNodeData,
  GetVariableNodeDataSchema,
} from '../../../flow-types.js';
import { ExecuteJsNode } from '../ExecuteJsNode.js';
import { GroupNode } from '../GroupNode.js';
import { HandlebarNode } from '../HandlebarNode.js';
import { LogNode } from '../LogNode.js';
import { MergeObjectsNode } from '../MergeObjectsNode.js';
import { DateTimeNode } from '../DateTimeNode.js';
import { RandomNode } from '../RandomNode.js';
import { StringToolsNode } from '../StringToolsNode.js';
import { MathNode } from '../MathNode.js';
import { NodeDefinition, HandleSpec } from './types.js';
import { FlowDataType } from '../../../flow-types.js';
import { GetPromptNode } from '../GetPromptNode.js';
import { GetVariableNode } from '../GetVariableNode.js';
import { SetVariableNode } from '../SetVariableNode.js';

export const logNodeDefinition: NodeDefinition<LogNodeData> = {
  type: 'logNode',
  label: 'Log',
  category: 'Utility',
  component: LogNode,
  dataSchema: LogNodeDataSchema,
  initialData: { prefix: 'Log:' },
  handles: {
    inputs: [{ id: 'value', type: FlowDataType.ANY }],
    outputs: [{ id: 'value', type: FlowDataType.ANY }],
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
  getDynamicHandles: (data) => {
    const inputs = [];
    for (let i = 0; i < data.inputCount; i++) {
      inputs.push({ id: `object_${i}`, type: FlowDataType.OBJECT });
    }
    return { inputs, outputs: [] };
  },
  getHandleType: ({ handleId, handleDirection }) => {
    if (handleDirection === 'input' && handleId?.startsWith('object_')) {
      return FlowDataType.OBJECT;
    }
    return undefined;
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

export const executeJsNodeDefinition: NodeDefinition<ExecuteJsNodeData> = {
  type: 'executeJsNode',
  label: 'Execute JS Code',
  category: 'Utility',
  component: ExecuteJsNode,
  dataSchema: ExecuteJsNodeDataSchema,
  initialData: { code: 'return input;' },
  handles: {
    inputs: [{ id: null, type: FlowDataType.ANY }],
    outputs: [{ id: null, type: FlowDataType.ANY }],
  },
};

export const dateTimeNodeDefinition: NodeDefinition<DateTimeNodeData> = {
  type: 'dateTimeNode',
  label: 'Date/Time',
  category: 'Utility',
  component: DateTimeNode,
  dataSchema: DateTimeNodeDataSchema,
  initialData: {},
  handles: {
    inputs: [{ id: 'format', type: FlowDataType.STRING }],
    outputs: [
      { id: 'iso', type: FlowDataType.STRING },
      { id: 'timestamp', type: FlowDataType.NUMBER },
      { id: 'year', type: FlowDataType.NUMBER },
      { id: 'month', type: FlowDataType.NUMBER },
      { id: 'day', type: FlowDataType.NUMBER },
      { id: 'hour', type: FlowDataType.NUMBER },
      { id: 'minute', type: FlowDataType.NUMBER },
      { id: 'second', type: FlowDataType.NUMBER },
    ],
  },
};

export const randomNodeDefinition: NodeDefinition<RandomNodeData> = {
  type: 'randomNode',
  label: 'Random',
  category: 'Utility',
  component: RandomNode,
  dataSchema: RandomNodeDataSchema,
  initialData: { mode: 'number', min: 0, max: 100 },
  handles: {
    inputs: [
      { id: 'min', type: FlowDataType.NUMBER },
      { id: 'max', type: FlowDataType.NUMBER },
      { id: 'array', type: FlowDataType.OBJECT }, // Array is a type of object
    ],
    outputs: [{ id: 'result', type: FlowDataType.ANY }],
  },
};

export const stringToolsNodeDefinition: NodeDefinition<StringToolsNodeData> = {
  type: 'stringToolsNode',
  label: 'String Tools',
  category: 'Utility',
  component: StringToolsNode,
  dataSchema: StringToolsNodeDataSchema,
  initialData: { operation: 'merge', inputCount: 2, delimiter: '' },
  handles: {
    inputs: [{ id: 'delimiter', type: FlowDataType.STRING }], // Static handle
    outputs: [{ id: 'result', type: FlowDataType.ANY }],
  },
  getDynamicHandles: (data) => {
    const inputs: HandleSpec[] = [];
    if (data.operation === 'merge') {
      for (let i = 0; i < (data.inputCount ?? 2); i++) {
        inputs.push({ id: `string_${i}`, type: FlowDataType.STRING });
      }
    } else if (data.operation === 'split') {
      inputs.push({ id: 'string', type: FlowDataType.STRING });
    } else if (data.operation === 'join') {
      inputs.push({ id: 'array', type: FlowDataType.OBJECT }); // Array
    }
    return { inputs, outputs: [] };
  },
  getHandleType: ({ handleId, handleDirection, node }) => {
    if (handleDirection === 'input') {
      const data = node.data as StringToolsNodeData;
      if (data.operation === 'merge' && handleId?.startsWith('string_')) return FlowDataType.STRING;
      if (data.operation === 'split' && handleId === 'string') return FlowDataType.STRING;
      if (data.operation === 'join' && handleId === 'array') return FlowDataType.OBJECT; // Array
    }
    if (handleDirection === 'output' && handleId === 'result') {
      const data = node.data as StringToolsNodeData;
      if (data.operation === 'split') return FlowDataType.OBJECT; // Array
      return FlowDataType.STRING;
    }
    return undefined;
  },
};

export const mathNodeDefinition: NodeDefinition<MathNodeData> = {
  type: 'mathNode',
  label: 'Math',
  category: 'Utility',
  component: MathNode,
  dataSchema: MathNodeDataSchema,
  initialData: { operation: 'add', a: 0, b: 0 },
  handles: {
    inputs: [
      { id: 'a', type: FlowDataType.NUMBER },
      { id: 'b', type: FlowDataType.NUMBER },
    ],
    outputs: [{ id: 'result', type: FlowDataType.NUMBER }],
  },
};

export const getPromptNodeDefinition: NodeDefinition<GetPromptNodeData> = {
  type: 'getPromptNode',
  label: 'Get Prompt',
  category: 'Utility',
  component: GetPromptNode,
  dataSchema: GetPromptNodeDataSchema,
  initialData: { promptName: '' },
  handles: {
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.STRING }],
  },
};

export const setVariableNodeDefinition: NodeDefinition<SetVariableNodeData> = {
  type: 'setVariableNode',
  label: 'Set Variable',
  category: 'Utility',
  component: SetVariableNode,
  dataSchema: SetVariableNodeDataSchema,
  initialData: { variableName: 'myVar' },
  handles: {
    inputs: [{ id: 'value', type: FlowDataType.ANY }],
    outputs: [{ id: 'value', type: FlowDataType.ANY }], // Passthrough
  },
};

export const getVariableNodeDefinition: NodeDefinition<GetVariableNodeData> = {
  type: 'getVariableNode',
  label: 'Get Variable',
  category: 'Utility',
  component: GetVariableNode,
  dataSchema: GetVariableNodeDataSchema,
  initialData: { variableName: 'myVar' },
  handles: {
    inputs: [],
    outputs: [{ id: 'value', type: FlowDataType.ANY }],
  },
};

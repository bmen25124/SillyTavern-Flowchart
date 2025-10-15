import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { StringToolsNode } from './StringToolsNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

export const StringToolsNodeDataSchema = z.object({
  operation: z
    .enum([
      'merge',
      'split',
      'join',
      'toUpperCase',
      'toLowerCase',
      'trim',
      'replace',
      'replaceAll',
      'slice',
      'length',
      'startsWith',
      'endsWith',
    ])
    .optional(),
  delimiter: z.string().optional(),
  inputCount: z.number().min(1).optional(),
  searchValue: z.string().optional(),
  replaceValue: z.string().optional(),
  index: z.number().optional(),
  count: z.number().optional(),
  _version: z.number().optional(),
});
export type StringToolsNodeData = z.infer<typeof StringToolsNodeDataSchema>;

const STRING_TOOLS_MERGE_HANDLE_PREFIX = 'string_';

const execute: NodeExecutor = async (node, input) => {
  const data = StringToolsNodeDataSchema.parse(node.data);
  const operation = resolveInput(input, data, 'operation') ?? 'merge';
  const definition = registrator.nodeDefinitionMap.get('stringToolsNode')!;
  const str = input.string ?? '';

  switch (operation) {
    case 'merge': {
      const delimiter = resolveInput(input, data, 'delimiter') ?? '';
      const strings = Object.keys(input)
        .filter((key) => definition.isDynamicHandle!(key))
        .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10))
        .map((key) => String(input[key]));
      return { result: strings.join(delimiter) };
    }
    case 'split': {
      const delimiter = resolveInput(input, data, 'delimiter') ?? '';
      if (typeof str !== 'string') throw new Error('Input for split must be a string.');
      return { result: str.split(delimiter) };
    }
    case 'join': {
      const delimiter = resolveInput(input, data, 'delimiter') ?? '';
      const arrToJoin = input.array;
      if (!Array.isArray(arrToJoin)) throw new Error('Input for join must be an array.');
      return { result: arrToJoin.join(delimiter) };
    }
    case 'toUpperCase':
      return { result: String(str).toUpperCase() };
    case 'toLowerCase':
      return { result: String(str).toLowerCase() };
    case 'trim':
      return { result: String(str).trim() };
    case 'replace': {
      const find = resolveInput(input, data, 'searchValue') ?? '';
      const repl = resolveInput(input, data, 'replaceValue') ?? '';
      return { result: String(str).replace(find, repl) };
    }
    case 'replaceAll': {
      const find = resolveInput(input, data, 'searchValue') ?? '';
      const repl = resolveInput(input, data, 'replaceValue') ?? '';
      return { result: String(str).replaceAll(find, repl) };
    }
    case 'slice': {
      const start = resolveInput(input, data, 'index') ?? 0;
      const end = resolveInput(input, data, 'count'); // end is optional for slice
      return { result: String(str).slice(start, end) };
    }
    case 'length':
      return { result: String(str).length };
    case 'startsWith': {
      const search = resolveInput(input, data, 'searchValue') ?? '';
      return { result: String(str).startsWith(search) };
    }
    case 'endsWith': {
      const search = resolveInput(input, data, 'searchValue') ?? '';
      return { result: String(str).endsWith(search) };
    }
    default:
      throw new Error(`Unknown string operation: ${operation}`);
  }
};

export const stringToolsNodeDefinition: NodeDefinition<StringToolsNodeData> = {
  type: 'stringToolsNode',
  label: 'String Tools',
  category: 'Data Processing',
  component: StringToolsNode,
  dataSchema: StringToolsNodeDataSchema,
  currentVersion: 1,
  initialData: { operation: 'merge', inputCount: 2, delimiter: '' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'operation', type: FlowDataType.STRING },
    ],
    outputs: [{ id: 'main', type: FlowDataType.ANY }],
  },
  validate: (node: Node<StringToolsNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const data = node.data;
    const operation = data.operation ?? 'merge';

    const isConnected = (handleId: string) => edges.some((e) => e.target === node.id && e.targetHandle === handleId);

    switch (operation) {
      case 'merge': {
        const connectedCount = edges.filter(
          (e) => e.target === node.id && e.targetHandle?.startsWith(STRING_TOOLS_MERGE_HANDLE_PREFIX),
        ).length;
        if (connectedCount < 2) {
          issues.push({
            message: 'At least two string inputs should be connected for a merge operation.',
            severity: 'warning',
          });
        }
        break;
      }
      case 'split':
      case 'toUpperCase':
      case 'toLowerCase':
      case 'trim':
      case 'length':
        if (!isConnected('string')) {
          issues.push({ message: 'A string must be connected to the "string" input.', severity: 'error' });
        }
        break;
      case 'join':
        if (!isConnected('array')) {
          issues.push({ message: 'An array must be connected to the "array" input.', severity: 'error' });
        }
        break;
      case 'replace':
      case 'replaceAll':
      case 'startsWith':
      case 'endsWith':
        if (!isConnected('string')) {
          issues.push({ message: 'A string must be connected to the "string" input.', severity: 'error' });
        }
        if (!data.searchValue && !isConnected('searchValue')) {
          issues.push({ fieldId: 'searchValue', message: 'Search Value is required.', severity: 'error' });
        }
        break;
      case 'slice':
        if (!isConnected('string')) {
          issues.push({ message: 'A string must be connected to the "string" input.', severity: 'error' });
        }
        if (data.index === undefined && !isConnected('index')) {
          issues.push({ fieldId: 'index', message: 'Start Index is required.', severity: 'error' });
        }
        break;
    }

    return issues;
  },
  execute,
  getDynamicHandleId: (index: number) => `${STRING_TOOLS_MERGE_HANDLE_PREFIX}${index}`,
  isDynamicHandle: (handleId: string | null) => handleId?.startsWith(STRING_TOOLS_MERGE_HANDLE_PREFIX) ?? false,
  getDynamicHandles: (node) => {
    const { data } = node;
    const inputs = [];
    let resultType = FlowDataType.ANY;

    switch (data.operation) {
      case 'merge':
        for (let i = 0; i < (data.inputCount ?? 2); i++) {
          inputs.push({ id: `${STRING_TOOLS_MERGE_HANDLE_PREFIX}${i}`, type: FlowDataType.ANY });
        }
        inputs.push({ id: 'delimiter', type: FlowDataType.STRING });
        resultType = FlowDataType.STRING;
        break;
      case 'split':
        inputs.push({ id: 'string', type: FlowDataType.STRING });
        inputs.push({ id: 'delimiter', type: FlowDataType.STRING });
        resultType = FlowDataType.OBJECT; // Array
        break;
      case 'join':
        inputs.push({ id: 'array', type: FlowDataType.OBJECT });
        inputs.push({ id: 'delimiter', type: FlowDataType.STRING });
        resultType = FlowDataType.STRING;
        break;
      case 'replace':
      case 'replaceAll':
        inputs.push({ id: 'string', type: FlowDataType.STRING });
        inputs.push({ id: 'searchValue', type: FlowDataType.STRING });
        inputs.push({ id: 'replaceValue', type: FlowDataType.STRING });
        resultType = FlowDataType.STRING;
        break;
      case 'slice':
        inputs.push({ id: 'string', type: FlowDataType.STRING });
        inputs.push({ id: 'index', type: FlowDataType.NUMBER });
        inputs.push({ id: 'count', type: FlowDataType.NUMBER });
        resultType = FlowDataType.STRING;
        break;
      case 'startsWith':
      case 'endsWith':
        inputs.push({ id: 'string', type: FlowDataType.STRING });
        inputs.push({ id: 'searchValue', type: FlowDataType.STRING });
        resultType = FlowDataType.BOOLEAN;
        break;
      case 'length':
        inputs.push({ id: 'string', type: FlowDataType.STRING });
        resultType = FlowDataType.NUMBER;
        break;
      case 'toUpperCase':
      case 'toLowerCase':
      case 'trim':
        inputs.push({ id: 'string', type: FlowDataType.STRING });
        resultType = FlowDataType.STRING;
        break;
    }

    const outputs = [{ id: 'result', type: resultType }];
    return { inputs, outputs };
  },
};

registrator.register(stringToolsNodeDefinition);

import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { GetFlowVariableNode } from './GetFlowVariableNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { resolveSchemaFromHandle } from '../../../utils/schema-builder.js';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';

export const GetFlowVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  _version: z.number().optional(),
});
export type GetFlowVariableNodeData = z.infer<typeof GetFlowVariableNodeDataSchema>;

const execute: NodeExecutor = async (node, input, { executionVariables }) => {
  const data = GetFlowVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  if (!variableName) throw new Error('Variable name is required.');
  if (!executionVariables.has(variableName)) throw new Error(`Execution variable "${variableName}" not found.`);
  const schema = input.schema;
  let value = executionVariables.get(variableName);

  if (schema !== undefined) {
    if (!schema || typeof schema.safeParse !== 'function') {
      throw new Error('Schema input for Get Flow Variable is invalid.');
    }
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new Error(`Value for variable "${variableName}" failed schema validation: ${result.error.message}`);
    }
    value = result.data;
  }

  return { value };
};

export const getFlowVariableNodeDefinition: NodeDefinition<GetFlowVariableNodeData> = {
  type: 'getFlowVariableNode',
  label: 'Get Flow Variable',
  category: 'Variables',
  component: GetFlowVariableNode,
  dataSchema: GetFlowVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'myVar' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'variableName', type: FlowDataType.STRING },
      { id: 'schema', type: FlowDataType.SCHEMA },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'value', type: FlowDataType.ANY },
    ],
  },
  validate: combineValidators(createRequiredFieldValidator('variableName', 'Variable Name is required.')),
  execute,
  getDynamicHandles: (node, allNodes, allEdges) => {
    const schema = resolveSchemaFromHandle(node, allNodes, allEdges, 'schema');
    if (!schema) return { inputs: [], outputs: [] };
    return {
      inputs: [],
      outputs: [{ id: 'value', type: zodTypeToFlowType(schema), schema }],
    };
  },
};

registrator.register(getFlowVariableNodeDefinition);

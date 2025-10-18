import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { GetGlobalVariableNode } from './GetGlobalVariableNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { resolveSchemaFromHandle } from '../../../utils/schema-builder.js';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';

export const GetGlobalVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  _version: z.number().optional(),
});
export type GetGlobalVariableNodeData = z.infer<typeof GetGlobalVariableNodeDataSchema>;

const execute: NodeExecutor = async (node, input, context) => {
  const data = GetGlobalVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  if (!variableName) throw new Error('Variable name is required.');

  const schema = input.schema;
  const value = await context.dependencies.st_getGlobalVariable(variableName);

  if (schema !== undefined) {
    if (!schema || typeof schema.safeParse !== 'function') {
      throw new Error('Schema input for Get Global Variable is invalid.');
    }
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new Error(`Global variable "${variableName}" failed schema validation: ${result.error.message}`);
    }
    return { value: result.data };
  }

  return { value };
};

export const getGlobalVariableNodeDefinition: NodeDefinition<GetGlobalVariableNodeData> = {
  type: 'getGlobalVariableNode',
  label: 'Get Global Variable',
  category: 'Variables',
  component: GetGlobalVariableNode,
  dataSchema: GetGlobalVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'globalVar' },
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

registrator.register(getGlobalVariableNodeDefinition);

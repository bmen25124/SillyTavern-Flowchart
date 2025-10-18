import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { GetLocalVariableNode } from './GetLocalVariableNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { resolveSchemaFromHandle } from '../../../utils/schema-builder.js';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';

export const GetLocalVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  _version: z.number().optional(),
});
export type GetLocalVariableNodeData = z.infer<typeof GetLocalVariableNodeDataSchema>;

const execute: NodeExecutor = async (node, input, context) => {
  const data = GetLocalVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  if (!variableName) throw new Error('Variable name is required.');

  const args = input.args;
  if (args !== undefined && (typeof args !== 'object' || args === null)) {
    throw new Error('Args input for Get Local Variable must be an object if provided.');
  }

  const schema = input.schema;
  const value = await context.dependencies.st_getLocalVariable(variableName, args);

  if (schema !== undefined) {
    if (!schema || typeof schema.safeParse !== 'function') {
      throw new Error('Schema input for Get Local Variable is invalid.');
    }
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new Error(`Local variable "${variableName}" failed schema validation: ${result.error.message}`);
    }
    return { value: result.data };
  }

  return { value };
};

export const getLocalVariableNodeDefinition: NodeDefinition<GetLocalVariableNodeData> = {
  type: 'getLocalVariableNode',
  label: 'Get Local Variable',
  category: 'Variables',
  component: GetLocalVariableNode,
  dataSchema: GetLocalVariableNodeDataSchema,
  currentVersion: 1,
  initialData: { variableName: 'chatVar' },
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'variableName', type: FlowDataType.STRING },
      { id: 'schema', type: FlowDataType.SCHEMA },
      { id: 'args', type: FlowDataType.OBJECT },
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

registrator.register(getLocalVariableNodeDefinition);

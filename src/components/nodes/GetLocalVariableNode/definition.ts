import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { GetLocalVariableNode } from './GetLocalVariableNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { applySchema, resolveSchemaFromHandle } from '../../../utils/schema-builder.js';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';

export const GetLocalVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  defaultValue: z.any().optional(),
  _version: z.number().optional(),
});
export type GetLocalVariableNodeData = z.infer<typeof GetLocalVariableNodeDataSchema>;

const execute: NodeExecutor = async (node, input, context) => {
  const data = GetLocalVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  if (!variableName) throw new Error('Variable name is required.');

  const schema = input.schema;
  let value = await context.dependencies.st_getLocalVariable(variableName);

  if (value === undefined && input.defaultValue !== undefined) {
    value = input.defaultValue;
  }

  const finalValue = applySchema(value, schema, 'Get Local Variable');

  return { value: finalValue };
};

export const getLocalVariableNodeDefinition: NodeDefinition<GetLocalVariableNodeData> = {
  type: 'getLocalVariableNode',
  label: 'Get Local Variable',
  category: 'Variables',
  component: GetLocalVariableNode,
  dataSchema: GetLocalVariableNodeDataSchema,
  currentVersion: 2,
  initialData: { variableName: 'chatVar', defaultValue: undefined },
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
    const flowType = zodTypeToFlowType(schema);
    return {
      inputs: [{ id: 'defaultValue', type: flowType, schema }],
      outputs: [{ id: 'value', type: flowType, schema }],
    };
  },
};

registrator.register(getLocalVariableNodeDefinition);

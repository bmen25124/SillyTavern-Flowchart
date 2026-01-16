import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { combineValidators, createRequiredFieldValidator } from '../../../utils/validation-helpers.js';
import { applySchema, resolveSchemaFromHandle } from '../../../utils/schema-builder.js';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';
import { DataDrivenNode } from '../DataDrivenNode.js';
import { createFieldConfig } from '../fieldConfig.js';
import { STInput } from 'sillytavern-utils-lib/components/react';

export const GetGlobalVariableNodeDataSchema = z.object({
  variableName: z.string().optional(),
  defaultValue: z.any().optional(),
  _version: z.number().optional(),
});
export type GetGlobalVariableNodeData = z.infer<typeof GetGlobalVariableNodeDataSchema>;

const execute: NodeExecutor = async (node, input, context) => {
  const data = GetGlobalVariableNodeDataSchema.parse(node.data);
  const variableName = resolveInput(input, data, 'variableName');
  if (!variableName) throw new Error('Variable name is required.');

  const schema = input.schema;
  let value = await context.dependencies.st_getGlobalVariable(variableName);

  if (value === undefined && input.defaultValue !== undefined) {
    value = input.defaultValue;
  }

  const finalValue = applySchema(value, schema, 'Get Global Variable');

  return { value: finalValue };
};

export const getGlobalVariableNodeDefinition: NodeDefinition<GetGlobalVariableNodeData> = {
  type: 'getGlobalVariableNode',
  label: 'Get Global Variable',
  category: 'Variables',
  component: DataDrivenNode,
  dataSchema: GetGlobalVariableNodeDataSchema,
  currentVersion: 2,
  initialData: { variableName: 'globalVar', defaultValue: undefined },
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
  meta: {
    fields: [
      createFieldConfig({
        id: 'variableName',
        label: 'Variable Name',
        component: STInput,
        props: { type: 'text' },
      }),
    ],
  },
};

registrator.register(getGlobalVariableNodeDefinition);

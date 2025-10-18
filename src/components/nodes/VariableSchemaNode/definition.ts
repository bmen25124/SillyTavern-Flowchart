import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { VariableSchemaNode } from './VariableSchemaNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { SchemaTypeDefinitionSchema } from '../SchemaNode/definition.js';
import { buildZodSchema } from '../../../utils/schema-builder.js';

export const VariableSchemaNodeDataSchema = z.object({
  definition: SchemaTypeDefinitionSchema.default({ type: 'string' }),
  _version: z.number().optional(),
});
export type VariableSchemaNodeData = z.infer<typeof VariableSchemaNodeDataSchema>;

const execute: NodeExecutor = async (node) => {
  const data = VariableSchemaNodeDataSchema.parse(node.data);
  const schema = buildZodSchema(data.definition);
  return { schema };
};

export const variableSchemaNodeDefinition: NodeDefinition<VariableSchemaNodeData> = {
  type: 'variableSchemaNode',
  label: 'Variable Schema',
  category: 'Variables',
  component: VariableSchemaNode,
  dataSchema: VariableSchemaNodeDataSchema,
  currentVersion: 1,
  initialData: { definition: { type: 'string' } },
  handles: {
    inputs: [{ id: 'main', type: FlowDataType.ANY }],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'schema', type: FlowDataType.SCHEMA },
    ],
  },
  execute,
};

registrator.register(variableSchemaNodeDefinition);

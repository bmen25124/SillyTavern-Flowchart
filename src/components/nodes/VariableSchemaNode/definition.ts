import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { VariableSchemaNode } from './VariableSchemaNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { SchemaTypeDefinitionSchema, schemaNodeDefinition } from '../SchemaNode/definition.js';
import { buildZodSchema } from '../../../utils/schema-builder.js';

export const VariableSchemaNodeDataSchema = z.object({
  mode: z.enum(['custom', 'predefined']).default('custom'),
  selectedSchema: z.string().optional(),
  definition: z.any().optional(), // for breaking circular dependency
  _version: z.number().optional(),
});
export type VariableSchemaNodeData = z.infer<typeof VariableSchemaNodeDataSchema>;

const execute: NodeExecutor = async (node) => {
  const data = VariableSchemaNodeDataSchema.parse(node.data);
  const predefinedSchemas = (schemaNodeDefinition.meta as any)?.schemas ?? {};

  if (data.mode === 'predefined') {
    const schema = predefinedSchemas[data.selectedSchema as string];
    if (!schema) {
      throw new Error(`Predefined schema "${data.selectedSchema}" not found.`);
    }
    return { schema };
  }

  // Custom mode
  const definition = data.definition ?? { type: 'string' };
  const parsedDefinition = SchemaTypeDefinitionSchema.safeParse(definition);

  if (!parsedDefinition.success) {
    throw new Error(`Invalid custom schema definition in VariableSchemaNode: ${parsedDefinition.error.message}`);
  }

  const schema = buildZodSchema(parsedDefinition.data);
  return { schema };
};

export const variableSchemaNodeDefinition: NodeDefinition<VariableSchemaNodeData> = {
  type: 'variableSchemaNode',
  label: 'Variable Schema',
  category: 'Variables',
  component: VariableSchemaNode,
  dataSchema: VariableSchemaNodeDataSchema,
  currentVersion: 3,
  initialData: { definition: { type: 'string' }, mode: 'custom' },
  handles: {
    inputs: [],
    outputs: [{ id: 'schema', type: FlowDataType.SCHEMA }],
  },
  execute,
};

registrator.register(variableSchemaNodeDefinition);

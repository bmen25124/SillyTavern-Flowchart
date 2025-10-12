import { JsonNodeData, JsonNodeDataSchema, SchemaNodeData, SchemaNodeDataSchema } from '../../../flow-types.js';
import { JsonNode } from '../JsonNode.js';
import { SchemaNode } from '../SchemaNode.js';
import { NodeDefinition } from './types.js';
import { FlowDataType } from '../../../flow-types.js';

export const jsonNodeDefinition: NodeDefinition<JsonNodeData> = {
  type: 'jsonNode',
  label: 'JSON',
  category: 'JSON',
  component: JsonNode,
  dataSchema: JsonNodeDataSchema,
  initialData: { rootType: 'object', items: [] },
  handles: {
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.OBJECT }],
  },
};

export const schemaNodeDefinition: NodeDefinition<SchemaNodeData> = {
  type: 'schemaNode',
  label: 'Schema',
  category: 'JSON',
  component: SchemaNode,
  dataSchema: SchemaNodeDataSchema,
  initialData: { fields: [] },
  handles: {
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.SCHEMA }],
  },
};

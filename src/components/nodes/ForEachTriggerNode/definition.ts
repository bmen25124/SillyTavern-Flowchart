import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveSchemaFromHandle } from '../../../utils/schema-builder.js';
import { zodTypeToFlowType } from '../../../utils/type-mapping.js';
import { SimpleDisplayNode } from '../SimpleDisplayNode.js';

export const ForEachTriggerNodeDataSchema = z.object({
  _version: z.number().optional(),
});
export type ForEachTriggerNodeData = z.infer<typeof ForEachTriggerNodeDataSchema>;

const execute: NodeExecutor = async (_node, input) => {
  // This trigger's job is to expose the input from the sub-flow call as named outputs.
  return { ...input };
};

export const forEachTriggerNodeDefinition: NodeDefinition<ForEachTriggerNodeData> = {
  type: 'forEachTriggerNode',
  label: 'For Each Trigger',
  category: 'Trigger',
  component: SimpleDisplayNode,
  dataSchema: ForEachTriggerNodeDataSchema,
  currentVersion: 1,
  initialData: {},
  handles: {
    inputs: [{ id: 'schema', type: FlowDataType.SCHEMA }],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'item', type: FlowDataType.ANY, label: 'Item' },
      { id: 'index', type: FlowDataType.NUMBER, label: 'Index' },
    ],
  },
  execute,
  getDynamicHandles: (node, allNodes, allEdges) => {
    const connectedSchema = resolveSchemaFromHandle(node, allNodes, allEdges, 'schema');

    const itemType = connectedSchema ? zodTypeToFlowType(connectedSchema) : FlowDataType.ANY;
    const itemSchema = connectedSchema ?? undefined;

    return {
      inputs: [],
      outputs: [
        { id: 'main', type: FlowDataType.ANY },
        { id: 'item', type: itemType, schema: itemSchema, label: 'Item' },
        { id: 'index', type: FlowDataType.NUMBER, label: 'Index' },
      ],
    };
  },
  meta: {
    description: 'Connect a Schema to provide a strong type for the `item` output.',
  },
};

registrator.register(forEachTriggerNodeDefinition);

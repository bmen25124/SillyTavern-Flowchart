import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { MergeObjectsNode } from './MergeObjectsNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { getHandleSpec } from '../../../utils/handle-logic.js';

export const MergeObjectsNodeDataSchema = z.object({
  inputCount: z.number().min(1).default(2),
  _version: z.number().optional(),
});
export type MergeObjectsNodeData = z.infer<typeof MergeObjectsNodeDataSchema>;

const MERGE_OBJECTS_HANDLE_PREFIX = 'object_';

const execute: NodeExecutor = async (node, input) => {
  const definition = registrator.nodeDefinitionMap.get('mergeObjectsNode')!;
  const objectsToMerge = Object.keys(input)
    .filter((key) => definition.isDynamicHandle!(key) && typeof input[key] === 'object' && input[key] !== null)
    .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10))
    .map((key) => input[key]);

  const merged = Object.assign({}, ...objectsToMerge);
  return { result: merged };
};

export const mergeObjectsNodeDefinition: NodeDefinition<MergeObjectsNodeData> = {
  type: 'mergeObjectsNode',
  label: 'Merge Objects',
  category: 'Utility',
  component: MergeObjectsNode,
  dataSchema: MergeObjectsNodeDataSchema,
  currentVersion: 1,
  initialData: { inputCount: 2 },
  handles: {
    inputs: [{ id: 'main', type: FlowDataType.ANY }],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'result', type: FlowDataType.OBJECT },
    ],
  },
  execute,
  getDynamicHandleId: (index: number) => `${MERGE_OBJECTS_HANDLE_PREFIX}${index}`,
  isDynamicHandle: (handleId: string | null) => handleId?.startsWith(MERGE_OBJECTS_HANDLE_PREFIX) ?? false,
  getDynamicHandles: (node, allNodes: Node[], allEdges: Edge[]) => {
    // Generate dynamic inputs
    const inputs = [];
    for (let i = 0; i < node.data.inputCount; i++) {
      inputs.push({ id: `${MERGE_OBJECTS_HANDLE_PREFIX}${i}`, type: FlowDataType.OBJECT });
    }

    // Dynamically generate the output schema by merging input schemas
    let mergedSchema = z.object({});
    for (let i = 0; i < node.data.inputCount; i++) {
      const handleId = `${MERGE_OBJECTS_HANDLE_PREFIX}${i}`;
      const edge = allEdges.find((e) => e.target === node.id && e.targetHandle === handleId);
      if (!edge) continue;

      const sourceNode = allNodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const sourceHandleSpec = getHandleSpec(sourceNode, edge.sourceHandle || null, 'output', allNodes, allEdges);

      // Check if the source handle provides a Zod object schema and merge it.
      if (sourceHandleSpec?.schema instanceof z.ZodObject) {
        mergedSchema = mergedSchema.merge(sourceHandleSpec.schema);
      }
    }

    const outputs = [{ id: 'result', type: FlowDataType.OBJECT, schema: mergedSchema }];

    return { inputs, outputs };
  },
  getHandleType: ({ handleId, handleDirection }) => {
    if (handleDirection === 'input' && handleId?.startsWith(MERGE_OBJECTS_HANDLE_PREFIX)) return FlowDataType.OBJECT;
    if (handleDirection === 'output' && handleId === 'result') return FlowDataType.OBJECT;
    return undefined;
  },
};

registrator.register(mergeObjectsNodeDefinition);

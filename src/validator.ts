import { z } from 'zod';
import {
  TriggerNodeDataSchema,
  IfNodeDataSchema,
  CreateMessagesNodeDataSchema,
  StringNodeDataSchema,
  NumberNodeDataSchema,
  StructuredRequestNodeDataSchema,
  SchemaNodeDataSchema,
  ProfileIdNodeDataSchema,
  CustomMessageNodeDataSchema,
  MergeMessagesNodeDataSchema,
  CreateCharacterNodeDataSchema,
  EditCharacterNodeDataSchema,
  ManualTriggerNodeDataSchema,
  GetCharacterNodeDataSchema,
  HandlebarNodeDataSchema,
  JsonNodeDataSchema,
  MergeObjectsNodeDataSchema,
} from './flow-types.js';
import { FlowData } from './constants.js';

const NodeDataSchemas: Record<string, z.ZodType<any, any>> = {
  triggerNode: TriggerNodeDataSchema,
  manualTriggerNode: ManualTriggerNodeDataSchema,
  ifNode: IfNodeDataSchema,
  createMessagesNode: CreateMessagesNodeDataSchema,
  customMessageNode: CustomMessageNodeDataSchema,
  mergeMessagesNode: MergeMessagesNodeDataSchema,
  mergeObjectsNode: MergeObjectsNodeDataSchema,
  stringNode: StringNodeDataSchema,
  numberNode: NumberNodeDataSchema,
  structuredRequestNode: StructuredRequestNodeDataSchema,
  schemaNode: SchemaNodeDataSchema,
  profileIdNode: ProfileIdNodeDataSchema,
  createCharacterNode: CreateCharacterNodeDataSchema,
  editCharacterNode: EditCharacterNodeDataSchema,
  getCharacterNode: GetCharacterNodeDataSchema,
  handlebarNode: HandlebarNodeDataSchema,
  jsonNode: JsonNodeDataSchema,
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  invalidNodeIds: Set<string>;
  invalidEdgeIds: Set<string>;
}

export const validateFlow = (flow: FlowData): ValidationResult => {
  const errors: string[] = [];
  const invalidNodeIds = new Set<string>();
  const invalidEdgeIds = new Set<string>();

  if (!flow.nodes || flow.nodes.length === 0) {
    return { isValid: true, errors: [], invalidNodeIds, invalidEdgeIds };
  }

  const nodeIds = new Set(flow.nodes.map((n) => n.id));

  // 1. Validate each node's data
  for (const node of flow.nodes) {
    const schema = NodeDataSchemas[node.type as string];
    if (schema) {
      const result = schema.safeParse(node.data);
      if (!result.success) {
        const formattedErrors = result.error.issues.map(
          (issue) => `Node [${node.id} (${node.type})]: ${issue.path.join('.')} - ${issue.message}`,
        );
        errors.push(...formattedErrors);
        invalidNodeIds.add(node.id);
      }
    } else if (node.type && !NodeDataSchemas[node.type]) {
      errors.push(`Node [${node.id}]: Unknown node type "${node.type}".`);
      invalidNodeIds.add(node.id);
    }
  }

  // 2. Validate edges
  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge [${edge.id}]: Source node "${edge.source}" not found.`);
      invalidEdgeIds.add(edge.id);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge [${edge.id}]: Target node "${edge.target}" not found.`);
      invalidEdgeIds.add(edge.id);
    }
  }

  // 3. Validate flow logic - Cycle Detection
  const adj: Record<string, string[]> = {};
  flow.nodes.forEach((node) => (adj[node.id] = []));
  flow.edges.forEach((edge) => {
    if (adj[edge.source]) {
      adj[edge.source].push(edge.target);
    }
  });

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  let hasCycle = false;

  const detectCycle = (nodeId: string) => {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adj[nodeId] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (detectCycle(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }
    recursionStack.delete(nodeId);
    return false;
  };

  for (const node of flow.nodes) {
    if (!visited.has(node.id)) {
      if (detectCycle(node.id)) {
        errors.push('Flow has a cycle (circular dependency).');
        hasCycle = true;
        break;
      }
    }
  }

  if (hasCycle) {
    // If a cycle is detected, further validation might be unreliable.
  }

  // 4. Validate trigger nodes
  const triggerNodes = flow.nodes.filter((n) => n.type === 'triggerNode' || n.type === 'manualTriggerNode');
  for (const triggerNode of triggerNodes) {
    const hasIncomingEdge = flow.edges.some((e) => e.target === triggerNode.id);
    if (hasIncomingEdge) {
      errors.push(`Trigger Node [${triggerNode.id}] cannot have incoming connections.`);
      invalidNodeIds.add(triggerNode.id);
    }

    if (triggerNode.type === 'triggerNode') {
      const hasOutgoingEdge = flow.edges.some((e) => e.source === triggerNode.id);
      if (hasOutgoingEdge) {
        errors.push(`Trigger Node [${triggerNode.id}] cannot have outgoing connections.`);
        invalidNodeIds.add(triggerNode.id);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    invalidNodeIds,
    invalidEdgeIds,
  };
};

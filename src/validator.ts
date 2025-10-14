import { SpecFlow } from './flow-spec.js';
import { registrator } from './components/nodes/autogen-imports.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  invalidNodeIds: Set<string>;
  invalidEdgeIds: Set<string>;
  errorsByNodeId: Map<string, string[]>;
}

export const validateFlow = (flow: SpecFlow): ValidationResult => {
  const errors: string[] = [];
  const invalidNodeIds = new Set<string>();
  const invalidEdgeIds = new Set<string>();
  const errorsByNodeId = new Map<string, string[]>();

  const addNodeError = (nodeId: string, message: string) => {
    if (!errorsByNodeId.has(nodeId)) {
      errorsByNodeId.set(nodeId, []);
    }
    errorsByNodeId.get(nodeId)!.push(message);
    invalidNodeIds.add(nodeId);
    errors.push(`Node [${nodeId}]: ${message}`);
  };

  if (!flow.nodes || flow.nodes.length === 0) {
    return { isValid: true, errors: [], invalidNodeIds, invalidEdgeIds, errorsByNodeId };
  }

  const nodeIds = new Set(flow.nodes.map((n) => n.id));

  // 1. Validate each node's data
  for (const node of flow.nodes) {
    const definition = registrator.nodeDefinitionMap.get(node.type as string);
    if (definition) {
      const result = definition.dataSchema.safeParse(node.data);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          addNodeError(node.id, `${issue.path.join('.')} - ${issue.message}`);
        });
      }
    } else if (node.type && !registrator.nodeDefinitionMap.has(node.type)) {
      addNodeError(node.id, `Unknown node type "${node.type}".`);
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
  const triggerNodes = flow.nodes.filter(
    (n) => n.type === 'triggerNode' || n.type === 'manualTriggerNode' || n.type === 'slashCommandNode',
  );
  for (const triggerNode of triggerNodes) {
    const hasIncomingEdge = flow.edges.some((e) => e.target === triggerNode.id);
    if (hasIncomingEdge) {
      const errorMsg = `Trigger nodes cannot have incoming connections.`;
      addNodeError(triggerNode.id, errorMsg);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    invalidNodeIds,
    invalidEdgeIds,
    errorsByNodeId,
  };
};

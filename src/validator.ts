import { SpecFlow } from './flow-spec.js';
import { registrator } from './components/nodes/autogen-imports.js';
import { ValidationIssue } from './components/nodes/definitions/types.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  invalidNodeIds: Set<string>;
  invalidEdgeIds: Set<string>;
  errorsByNodeId: Map<string, ValidationIssue[]>;
}

export const validateFlow = (flow: SpecFlow): ValidationResult => {
  const errors: string[] = [];
  const invalidNodeIds = new Set<string>();
  const invalidEdgeIds = new Set<string>();
  const errorsByNodeId = new Map<string, ValidationIssue[]>();

  const addNodeError = (nodeId: string, nodeType: string, issue: ValidationIssue) => {
    if (!errorsByNodeId.has(nodeId)) {
      errorsByNodeId.set(nodeId, []);
    }
    errorsByNodeId.get(nodeId)!.push(issue);
    if (issue.severity === 'error') {
      invalidNodeIds.add(nodeId);
      errors.push(`Node [${nodeType}]: ${issue.message}`);
    }
  };

  if (!flow.nodes || flow.nodes.length === 0) {
    return { isValid: true, errors: [], invalidNodeIds, invalidEdgeIds, errorsByNodeId };
  }

  const nodeIds = new Set(flow.nodes.map((n) => n.id));

  // 1. Validate each node's data schema (Zod) and semantic rules (validate function)
  for (const node of flow.nodes) {
    if (node.data?.disabled) {
      continue;
    }
    const definition = registrator.nodeDefinitionMap.get(node.type as string);
    if (definition) {
      // Zod schema validation
      const result = definition.dataSchema.safeParse(node.data);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          addNodeError(node.id, node.type, {
            fieldId: issue.path.join('.'),
            message: issue.message,
            severity: 'error',
          });
        });
      }

      // Semantic validation
      if (definition.validate) {
        const issues = definition.validate(node as any, flow.edges as any);
        issues.forEach((issue) => addNodeError(node.id, node.type, issue));
      }
    } else if (node.type && !registrator.nodeDefinitionMap.has(node.type)) {
      addNodeError(node.id, node.type, { message: `Unknown node type "${node.type}".`, severity: 'error' });
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
        break;
      }
    }
  }

  // 4. Validate trigger nodes
  const triggerNodes = flow.nodes.filter(
    (n) => n.type === 'triggerNode' || n.type === 'manualTriggerNode' || n.type === 'slashCommandNode',
  );
  for (const triggerNode of triggerNodes) {
    const hasIncomingEdge = flow.edges.some((e) => e.target === triggerNode.id);
    if (hasIncomingEdge) {
      addNodeError(triggerNode.id, triggerNode.type, {
        message: `Trigger nodes cannot have incoming connections.`,
        severity: 'error',
      });
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

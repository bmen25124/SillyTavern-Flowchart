import { SpecFlow, SpecNode } from './flow-spec.js';
import { registrator } from './components/nodes/autogen-imports.js';
import { ValidationIssue } from './components/nodes/definitions/types.js';
import { IfNodeData } from './components/nodes/IfNode/definition.js';
import { RunFlowNodeData } from './components/nodes/RunFlowNode/definition.js';
import { settingsManager } from './config.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  invalidNodeIds: Set<string>;
  invalidEdgeIds: Set<string>;
  errorsByNodeId: Map<string, ValidationIssue[]>;
}

/**
 * Recursively checks for circular references caused by "Run Flow" nodes.
 * @param startFlowId - The ID of the flow where the "Run Flow" node resides.
 * @param node - The "Run Flow" node to check.
 * @param path - The chain of flow IDs leading to this point.
 * @param allFlows - All available flows in the system.
 * @returns An error message if a cycle is detected, otherwise null.
 */
function detectCrossFlowCycle(
  startFlowId: string,
  node: SpecNode,
  path: string[],
  allFlows: { id: string; name: string; flow: SpecFlow }[],
): string | null {
  if (node.type !== 'runFlowNode') {
    return null;
  }

  const runFlowData = node.data as RunFlowNodeData;
  const targetFlowId = runFlowData.flowId;

  // We can only validate statically set flow IDs. Dynamic ones are a runtime concern.
  if (!targetFlowId) {
    return null;
  }

  const newPath = [...path, startFlowId];

  // Cycle detected
  if (newPath.includes(targetFlowId)) {
    const cyclePath = [...newPath, targetFlowId];
    const cycleNames = cyclePath.map((id) => allFlows.find((f) => f.id === id)?.name || id).join(' -> ');
    return `Circular sub-flow reference detected: ${cycleNames}`;
  }

  const targetFlow = allFlows.find((f) => f.id === targetFlowId);
  if (!targetFlow) {
    // This is handled by a different check, but we can stop traversing here.
    return null;
  }

  // Recurse into the target flow's nodes
  for (const nextNode of targetFlow.flow.nodes) {
    const cycleError = detectCrossFlowCycle(targetFlowId, nextNode, newPath, allFlows);
    if (cycleError) {
      return cycleError;
    }
  }

  return null;
}

export const validateFlow = (flow: SpecFlow, allowDangerousExecution: boolean, flowId: string): ValidationResult => {
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
  const allFlows = settingsManager.getSettings().flows;

  // 1. Validate each node's data schema, semantic rules, and dangerous permissions
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

      // Dangerous node permission validation
      let isNodeConsideredDangerous = definition.isDangerous;
      if (node.type === 'ifNode') {
        // IfNode is only dangerous if a condition is in advanced mode.
        isNodeConsideredDangerous = (node.data as IfNodeData).conditions.some((c) => c.mode === 'advanced');
      }

      if (isNodeConsideredDangerous && !allowDangerousExecution) {
        addNodeError(node.id, node.type, {
          message: "This dangerous node requires permission. Enable 'Allow Dangerous' in the flow settings.",
          severity: 'error',
        });
      }

      // Check Run Flow nodes for disabled/non-existent targets and cycles
      if (node.type === 'runFlowNode') {
        const runFlowData = node.data as RunFlowNodeData;
        const targetFlowId = runFlowData.flowId;

        if (targetFlowId) {
          const targetFlowData = allFlows.find((f) => f.id === targetFlowId);

          if (!targetFlowData) {
            addNodeError(node.id, node.type, {
              fieldId: 'flowId',
              message: `Targets a non-existent flow.`,
              severity: 'error',
            });
          } else if (!targetFlowData.enabled) {
            addNodeError(node.id, node.type, {
              fieldId: 'flowId',
              message: `Targets disabled flow: "${targetFlowData.name}".`,
              severity: 'error',
            });
          } else {
            // Check for circular references starting from this node.
            const cycleError = detectCrossFlowCycle(flowId, node, [], allFlows);
            if (cycleError) {
              addNodeError(node.id, node.type, {
                fieldId: 'flowId',
                message: cycleError,
                severity: 'error',
              });
            }
          }
        }
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

  // 3. Validate flow logic - Cycle Detection (within a single flow)
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

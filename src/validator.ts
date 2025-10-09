import { z } from 'zod';
import { FlowData } from './config.js';
import { StarterNodeDataSchema, IfElseNodeDataSchema } from './flow-types.js';

const NodeDataSchemas: Record<string, z.ZodType<any, any>> = {
  starterNode: StarterNodeDataSchema,
  ifElseNode: IfElseNodeDataSchema,
};

export const validateFlow = (flow: FlowData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!flow.nodes || flow.nodes.length === 0) {
    // Not an error, just an empty flow.
    return { isValid: true, errors: [] };
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
      }
    } else if (node.type) {
      errors.push(`Node [${node.id}]: Unknown node type "${node.type}".`);
    }
  }

  // 2. Validate edges
  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge [${edge.id}]: Source node "${edge.source}" not found.`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge [${edge.id}]: Target node "${edge.target}" not found.`);
    }
  }

  // 3. Validate flow logic
  const starterNodes = flow.nodes.filter((n) => n.type === 'starterNode');
  if (starterNodes.length === 0) {
    errors.push('Flow must have at least one Starter Node.');
  }

  for (const starterNode of starterNodes) {
    const hasOutgoingEdge = flow.edges.some((e) => e.source === starterNode.id);
    if (!hasOutgoingEdge) {
      errors.push(`Starter Node [${starterNode.id}] must have an outgoing connection.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

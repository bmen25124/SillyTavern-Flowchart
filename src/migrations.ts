import { SpecFlow, SpecNode, SpecEdge } from './flow-spec.js';
import { registrator } from './components/nodes/autogen-imports.js';

// A function that transforms a node's data from one version to the next.
type NodeMigration = (data: any) => any;
// A function that can modify edges based on a node being migrated.
type EdgeMigration = (node: SpecNode, edges: SpecEdge[]) => SpecEdge[];

interface Migration {
  node?: NodeMigration;
  edge?: EdgeMigration;
}

// Registry: { nodeType: { fromVersion: MigrationFunction } }
const MIGRATION_REGISTRY: Record<string, Record<number, Migration>> = {};

/**
 * Example: Migrating `stringNode` from v1 to v2 where `data.value` is renamed to `data.text`.
 * All new nodes will be created with `currentVersion: 2`.
 */
/*
// In stringNode definition:
// currentVersion: 2,
// initialData: { text: 'hello', _version: 2 }

MIGRATION_REGISTRY['stringNode'] = {
  1: {
    node: (data) => {
      // Rename `value` to `text` and bump version.
      return { text: data.value, _version: 2 };
    },
  },
};
*/

/**
 * Example for your specific question: Renaming an input handle on `logNode`
 * from `value` to `logValue`.
 */
/*
// In logNode definition:
// handles: { inputs: [{ id: 'logValue', type: FlowDataType.ANY }] ... }

MIGRATION_REGISTRY['logNode'] = {
  1: {
    edge: (node, edges) => {
      return edges.map(edge => {
        if (edge.target === node.id && edge.targetHandle === 'value') {
          return { ...edge, targetHandle: 'logValue' };
        }
        return edge;
      });
    },
    // You also need a node migration to bump the version number
    node: (data) => ({ ...data, _version: 2 }),
  },
};
*/

export function runMigrations(flow: SpecFlow): SpecFlow {
  let migratedEdges = [...flow.edges];

  const migratedNodes = flow.nodes.map((node) => {
    const definition = registrator.nodeDefinitionMap.get(node.type);
    if (!definition) {
      // Unknown node type, can't migrate.
      return node;
    }

    let currentVersion = node.data._version ?? 0; // Assume version 0 if undefined
    let nodeData = { ...node.data };

    while (currentVersion < definition.currentVersion) {
      const migrator = MIGRATION_REGISTRY[node.type]?.[currentVersion];
      if (!migrator) {
        // No migrator found, we can't proceed for this node.
        console.warn(
          `[Migration] No migration found for node type "${node.type}" from version ${currentVersion} to ${
            currentVersion + 1
          }. Halting migration for this node.`,
        );
        // To be safe, just set the version to latest to prevent infinite loops.
        nodeData._version = definition.currentVersion;
        break;
      }

      if (migrator.node) {
        nodeData = migrator.node(nodeData);
      }

      // The edge migrator needs the original node context, so we pass it in
      if (migrator.edge) {
        const tempNodeWithNewData = { ...node, data: nodeData };
        migratedEdges = migrator.edge(tempNodeWithNewData, migratedEdges);
      }

      currentVersion = nodeData._version; // The migrator MUST update the version.
    }

    return { ...node, data: nodeData };
  });

  return { nodes: migratedNodes, edges: migratedEdges };
}

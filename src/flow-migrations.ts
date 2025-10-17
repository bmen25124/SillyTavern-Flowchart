import { SpecFlow } from './flow-spec.js';

// Define flow format versions
export const FLOW_FORMAT_VERSIONS = {
  V1_0: '1.0', // Initial flow format version
  // Add more versions as needed
} as const;

export type FlowFormatVersion = (typeof FLOW_FORMAT_VERSIONS)[keyof typeof FLOW_FORMAT_VERSIONS];

// Current flow version for new flows
export const CURRENT_FLOW_VERSION = FLOW_FORMAT_VERSIONS.V1_0;

// Type for a flow migration function
type FlowMigration = (flow: SpecFlow) => SpecFlow;

// Migration registry: fromVersion -> toVersion -> migrationFunction
const FLOW_MIGRATION_REGISTRY: Record<string, Record<string, FlowMigration>> = {};

/**
 * Register a flow migration from one version to another
 */
export function registerFlowMigration(fromVersion: string, toVersion: string, migration: FlowMigration): void {
  if (!FLOW_MIGRATION_REGISTRY[fromVersion]) {
    FLOW_MIGRATION_REGISTRY[fromVersion] = {};
  }
  FLOW_MIGRATION_REGISTRY[fromVersion][toVersion] = migration;
}

/**
 * Get available migration path from a version to the target version
 */
function getMigrationPath(fromVersion: string, toVersion: string): string[] | null {
  if (fromVersion === toVersion) {
    return [];
  }

  const visited = new Set<string>();
  const queue: { version: string; path: string[] }[] = [{ version: fromVersion, path: [fromVersion] }];

  while (queue.length > 0) {
    const { version, path } = queue.shift()!;

    if (version === toVersion) {
      return path;
    }

    if (visited.has(version)) {
      continue;
    }

    visited.add(version);

    const migrations = FLOW_MIGRATION_REGISTRY[version];
    if (migrations) {
      for (const nextVersion in migrations) {
        if (!visited.has(nextVersion)) {
          queue.push({ version: nextVersion, path: [...path, nextVersion] });
        }
      }
    }
  }

  return null; // No path found
}

/**
 * Migrate a flow from its current version to the target version
 */
export function migrateFlowFormat(flow: SpecFlow, currentVersion: string | undefined, targetVersion: string): SpecFlow {
  const fromVersion = currentVersion || FLOW_FORMAT_VERSIONS.V1_0;

  if (fromVersion === targetVersion) {
    return flow;
  }

  const migrationPath = getMigrationPath(fromVersion, targetVersion);

  if (!migrationPath) {
    console.warn(
      `[Flowchart] No migration path found from ${fromVersion} to ${targetVersion}. Flow may not work correctly.`,
    );
    return flow;
  }

  let migratedFlow = flow;

  // Apply migrations step by step
  for (let i = 0; i < migrationPath.length - 1; i++) {
    const currentVersion = migrationPath[i];
    const nextVersion = migrationPath[i + 1];

    const migration = FLOW_MIGRATION_REGISTRY[currentVersion]?.[nextVersion];
    if (migration) {
      try {
        migratedFlow = migration(migratedFlow);
        console.log(`[Flowchart] Migrated flow from ${currentVersion} to ${nextVersion}`);
      } catch (error) {
        console.error(`[Flowchart] Failed to migrate flow from ${currentVersion} to ${nextVersion}:`, error);
        break;
      }
    } else {
      console.warn(`[Flowchart] No migration function found for ${currentVersion} -> ${nextVersion}`);
      break;
    }
  }

  return migratedFlow;
}

// Example migration from V1.0 to V1.1 (hypothetical - just for demonstration)

// Migration from V1.0 to V1.0 (no change needed)
registerFlowMigration(FLOW_FORMAT_VERSIONS.V1_0, FLOW_FORMAT_VERSIONS.V1_0, (flow: SpecFlow) => {
  // No migration needed for same version
  return flow;
});

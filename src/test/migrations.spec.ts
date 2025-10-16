import { SpecFlow } from '../flow-spec.js';
import { migrateFlowFormat, FLOW_FORMAT_VERSIONS } from '../flow-migrations.js';

describe('migrations', () => {
  describe('migrateFlowFormat', () => {
    it('should not modify flow when fromVersion equals targetVersion', () => {
      const flow: SpecFlow = {
        nodes: [],
        edges: [],
      };

      const migratedFlow = migrateFlowFormat(flow, FLOW_FORMAT_VERSIONS.V1_0, FLOW_FORMAT_VERSIONS.V1_0);

      expect(migratedFlow).toEqual(flow);
    });

    it('should migrate flow from V1.0 to V1.0 (no change)', () => {
      const flow: SpecFlow = {
        nodes: [{ id: '1', type: 'stringNode', position: { x: 0, y: 0 }, data: { text: 'hello', _version: 1 } }],
        edges: [],
      };

      const migratedFlow = migrateFlowFormat(flow, FLOW_FORMAT_VERSIONS.V1_0, FLOW_FORMAT_VERSIONS.V1_0);

      expect(migratedFlow).toEqual(flow);
    });

    it('should handle undefined currentVersion by defaulting to V1_0', () => {
      const flow: SpecFlow = {
        nodes: [],
        edges: [],
      };

      const migratedFlow = migrateFlowFormat(flow, undefined, FLOW_FORMAT_VERSIONS.V1_0);

      expect(migratedFlow).toEqual(flow);
    });

    it('should warn when no migration path is found', () => {
      // Mock console.warn to capture the warning
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const flow: SpecFlow = {
        nodes: [],
        edges: [],
      };

      // Try to migrate to a non-existent version
      const migratedFlow = migrateFlowFormat(flow, FLOW_FORMAT_VERSIONS.V1_0, '2.0');

      expect(migratedFlow).toEqual(flow);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[FlowChart] No migration path found from 1.0 to 2.0. Flow may not work correctly.',
      );

      consoleWarnSpy.mockRestore();
    });
  });
});

import { SpecFlow } from '../flow-spec.js';
import { runMigrations } from '../migrations.js';

// Mock the registrator to control node definitions in tests
jest.mock('../components/nodes/autogen-imports.js', () => ({
  registrator: {
    nodeDefinitionMap: new Map(),
  },
}));

import { registrator } from '../components/nodes/autogen-imports.js';

describe('node migrations', () => {
  beforeEach(() => {
    // Clear the node definition map before each test
    registrator.nodeDefinitionMap.clear();
  });

  describe('runMigrations', () => {
    it('should not modify nodes when no migrations are needed', () => {
      // Set up a mock node definition with current version
      registrator.nodeDefinitionMap.set('testNode', {
        type: 'testNode',
        label: 'Test Node',
        category: 'Utility',
        component: {} as any,
        dataSchema: {} as any,
        initialData: {},
        currentVersion: 1,
        handles: { inputs: [], outputs: [] },
        execute: {} as any,
      });

      const flow: SpecFlow = {
        nodes: [{ id: '1', type: 'testNode', position: { x: 0, y: 0 }, data: { value: 'test', _version: 1 } }],
        edges: [],
      };

      const migratedFlow = runMigrations(flow);

      expect(migratedFlow).toEqual(flow);
    });

    it('should leave unknown node types unchanged', () => {
      const flow: SpecFlow = {
        nodes: [{ id: '1', type: 'unknownNodeType', position: { x: 0, y: 0 }, data: { value: 'test' } }],
        edges: [],
      };

      const migratedFlow = runMigrations(flow);

      expect(migratedFlow).toEqual(flow);
    });

    it('should warn when no migrator is found for a node that needs migration', () => {
      // Mock console.warn to capture the warning
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Set up a mock node definition with a higher current version
      registrator.nodeDefinitionMap.set('testNode', {
        type: 'testNode',
        label: 'Test Node',
        category: 'Utility',
        component: {} as any,
        dataSchema: {} as any,
        initialData: {},
        currentVersion: 2,
        handles: { inputs: [], outputs: [] },
        execute: {} as any,
      });

      const flow: SpecFlow = {
        nodes: [{ id: '1', type: 'testNode', position: { x: 0, y: 0 }, data: { value: 'test', _version: 1 } }],
        edges: [],
      };

      const migratedFlow = runMigrations(flow);

      // Node version should be updated to latest even without migrator
      expect(migratedFlow.nodes[0].data._version).toBe(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Migration] No migration found for node type "testNode" from version 1 to 2. Halting migration for this node.',
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle edge case with undefined _version', () => {
      registrator.nodeDefinitionMap.set('testNode', {
        type: 'testNode',
        label: 'Test Node',
        category: 'Utility',
        component: {} as any,
        dataSchema: {} as any,
        initialData: {},
        currentVersion: 1,
        handles: { inputs: [], outputs: [] },
        execute: {} as any,
      });

      const flow: SpecFlow = {
        nodes: [
          { id: '1', type: 'testNode', position: { x: 0, y: 0 }, data: { value: 'test' } }, // No _version
        ],
        edges: [],
      };

      const migratedFlow = runMigrations(flow);

      // Should assume version 0 and update to current version
      expect(migratedFlow.nodes[0].data._version).toBe(1);
    });
  });
});

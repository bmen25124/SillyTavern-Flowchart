import { SpecFlow } from '../flow-spec.js';
import { runMigrations } from '../migrations.js';
import { FlowDataType } from '../flow-types.js';

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

  it('should migrate triggerNode through all versions', () => {
    registrator.nodeDefinitionMap.set('triggerNode', {
      type: 'triggerNode',
      label: 'Trigger',
      category: 'Trigger' as any,
      component: {} as any,
      dataSchema: {} as any,
      initialData: {},
      currentVersion: 2,
      handles: { inputs: [], outputs: [] },
      execute: {} as any,
    });

    const flow: SpecFlow = {
      nodes: [
        {
          id: '1',
          type: 'triggerNode',
          position: { x: 0, y: 0 },
          data: { someOldData: 'value', _version: 1 },
        },
      ],
      edges: [],
    };

    const migratedFlow = runMigrations(flow);

    expect(migratedFlow.nodes[0].data).toEqual({
      someOldData: 'value',
      preventRecursive: true,
      _version: 2,
    });
  });

  it('should migrate variable nodes through all versions', () => {
    const mockDefinition = {
      type: 'getLocalVariableNode',
      label: 'Get Local Variable',
      category: 'Variables' as any,
      component: {} as any,
      dataSchema: {} as any,
      initialData: {},
      currentVersion: 2,
      handles: { inputs: [], outputs: [] },
      execute: {} as any,
    };

    registrator.nodeDefinitionMap.set('getLocalVariableNode', mockDefinition);
    registrator.nodeDefinitionMap.set('getGlobalVariableNode', mockDefinition);
    registrator.nodeDefinitionMap.set('getFlowVariableNode', mockDefinition);

    const flow: SpecFlow = {
      nodes: [
        {
          id: '1',
          type: 'getLocalVariableNode',
          position: { x: 0, y: 0 },
          data: { variableName: 'testVar', defaultValue: 'default', _version: 1 },
        },
        {
          id: '2',
          type: 'getGlobalVariableNode',
          position: { x: 0, y: 0 },
          data: { variableName: 'testVar', defaultValue: 'default', _version: 1 },
        },
        {
          id: '3',
          type: 'getFlowVariableNode',
          position: { x: 0, y: 0 },
          data: { variableName: 'testVar', defaultValue: 'default', _version: 1 },
        },
      ],
      edges: [],
    };

    const migratedFlow = runMigrations(flow);

    expect(migratedFlow.nodes[0].data).toEqual({
      variableName: 'testVar',
      defaultValue: undefined,
      _version: 2,
    });

    expect(migratedFlow.nodes[1].data).toEqual({
      variableName: 'testVar',
      defaultValue: undefined,
      _version: 2,
    });

    expect(migratedFlow.nodes[2].data).toEqual({
      variableName: 'testVar',
      defaultValue: undefined,
      _version: 2,
    });
  });

  it('should migrate editCharacterNode through all versions with edge migration', () => {
    registrator.nodeDefinitionMap.set('editCharacterNode', {
      type: 'editCharacterNode',
      label: 'Edit Character',
      category: 'Character' as any,
      component: {} as any,
      dataSchema: {} as any,
      initialData: {},
      currentVersion: 2,
      handles: {
        inputs: [],
        outputs: [
          { id: 'result', type: FlowDataType.OBJECT },
          { id: 'name', type: FlowDataType.STRING },
        ],
      },
      execute: {} as any,
    });

    const flow: SpecFlow = {
      nodes: [
        {
          id: '1',
          type: 'editCharacterNode',
          position: { x: 0, y: 0 },
          data: { characterAvatar: 'avatar.png', _version: 1 },
        },
        {
          id: '2',
          type: 'someOtherNode',
          position: { x: 100, y: 100 },
          data: {},
        },
      ],
      edges: [
        {
          id: 'e1',
          source: '1',
          target: '2',
          sourceHandle: 'result',
          targetHandle: 'input',
        },
      ],
    };

    const migratedFlow = runMigrations(flow);

    // Node should be migrated
    expect(migratedFlow.nodes[0].data).toEqual({
      characterAvatar: 'avatar.png',
      _version: 2,
    });

    // Edge should be migrated - sourceHandle 'result' should become 'name'
    expect(migratedFlow.edges[0]).toEqual({
      id: 'e1',
      source: '1',
      target: '2',
      sourceHandle: 'name',
      targetHandle: 'input',
    });
  });

  it('should migrate schemaNode through all versions', () => {
    registrator.nodeDefinitionMap.set('schemaNode', {
      type: 'schemaNode',
      label: 'Schema',
      category: 'JSON' as any,
      component: {} as any,
      dataSchema: {} as any,
      initialData: {},
      currentVersion: 3,
      handles: { inputs: [], outputs: [{ id: 'result', type: FlowDataType.SCHEMA }] },
      execute: {} as any,
    });

    const flow: SpecFlow = {
      nodes: [
        {
          id: '1',
          type: 'schemaNode',
          position: { x: 0, y: 0 },
          data: {
            fields: [
              {
                id: '1',
                name: 'test',
                type: 'object',
                fields: [
                  {
                    id: '2',
                    name: 'nested',
                    type: 'string',
                  },
                ],
              },
              {
                id: '3',
                name: 'arrayField',
                type: 'array',
                items: {
                  id: '4',
                  name: 'item',
                  type: 'number',
                },
              },
            ],
            _version: 1,
          },
        },
      ],
      edges: [],
    };

    const migratedFlow = runMigrations(flow);

    // After all migrations, should be at version 3 with required fields added
    expect(migratedFlow.nodes[0].data).toEqual({
      fields: [
        {
          id: '1',
          name: 'test',
          type: 'object',
          required: true,
          fields: [
            {
              id: '2',
              name: 'nested',
              type: 'string',
              required: true,
            },
          ],
        },
        {
          id: '3',
          name: 'arrayField',
          type: 'array',
          required: true,
          items: {
            id: '4',
            name: 'item',
            type: 'number',
            required: true,
          },
        },
      ],
      mode: 'custom',
      selectedSchema: undefined,
      _version: 3,
    });
  });

  it('should migrate variableSchemaNode through all versions', () => {
    registrator.nodeDefinitionMap.set('variableSchemaNode', {
      type: 'variableSchemaNode',
      label: 'Variable Schema',
      category: 'Variables' as any,
      component: {} as any,
      dataSchema: {} as any,
      initialData: {},
      currentVersion: 3,
      handles: { inputs: [], outputs: [{ id: 'schema', type: FlowDataType.SCHEMA }] },
      execute: {} as any,
    });

    const flow: SpecFlow = {
      nodes: [
        {
          id: '1',
          type: 'variableSchemaNode',
          position: { x: 0, y: 0 },
          data: {
            definition: {
              type: 'object',
              fields: [
                {
                  id: '1',
                  name: 'test',
                  type: 'object',
                  fields: [
                    {
                      id: '2',
                      name: 'nested',
                      type: 'string',
                    },
                  ],
                },
                {
                  id: '3',
                  name: 'arrayField',
                  type: 'array',
                  items: {
                    id: '4',
                    name: 'item',
                    type: 'number',
                  },
                },
              ],
            },
            _version: 1,
          },
        },
      ],
      edges: [],
    };

    const migratedFlow = runMigrations(flow);

    // After all migrations, should be at version 3 with required fields added
    expect(migratedFlow.nodes[0].data).toEqual({
      definition: {
        type: 'object',
        required: true,
        fields: [
          {
            id: '1',
            name: 'test',
            type: 'object',
            required: true,
            fields: [
              {
                id: '2',
                name: 'nested',
                type: 'string',
                required: true,
              },
            ],
          },
          {
            id: '3',
            name: 'arrayField',
            type: 'array',
            required: true,
            items: {
              id: '4',
              name: 'item',
              type: 'number',
              required: true,
            },
          },
        ],
      },
      mode: 'custom',
      _version: 3,
    });
  });

  it('should migrate runFlowNode through all versions', () => {
    registrator.nodeDefinitionMap.set('runFlowNode', {
      type: 'runFlowNode',
      label: 'Run Flow',
      category: 'Flow' as any,
      component: {} as any,
      dataSchema: {} as any,
      initialData: {},
      currentVersion: 2,
      handles: { inputs: [], outputs: [] },
      execute: {} as any,
    });

    const flow: SpecFlow = {
      nodes: [
        {
          id: '1',
          type: 'runFlowNode',
          position: { x: 0, y: 0 },
          data: { flowId: 'test-flow', _version: 1 },
        },
      ],
      edges: [],
    };

    const migratedFlow = runMigrations(flow);

    expect(migratedFlow.nodes[0].data).toEqual({
      flowId: 'test-flow',
      _version: 2,
    });
  });

  it('should migrate manualTriggerNode through all versions', () => {
    registrator.nodeDefinitionMap.set('manualTriggerNode', {
      type: 'manualTriggerNode',
      label: 'Manual Trigger',
      category: 'Trigger' as any,
      component: {} as any,
      dataSchema: {} as any,
      initialData: {},
      currentVersion: 2,
      handles: { inputs: [], outputs: [] },
      execute: {} as any,
    });

    const flow: SpecFlow = {
      nodes: [
        {
          id: '1',
          type: 'manualTriggerNode',
          position: { x: 0, y: 0 },
          data: { triggerName: 'test-trigger', _version: 1 },
        },
      ],
      edges: [],
    };

    const migratedFlow = runMigrations(flow);

    expect(migratedFlow.nodes[0].data).toEqual({
      triggerName: 'test-trigger',
      _version: 2,
    });
  });
});

import { SpecFlow } from '../flow-spec.js';
import { validateFlow } from '../validator.js';
import { settingsManager, FlowData } from '../config.js';
import { generateUUID } from '../utils/uuid.js';

// Mock config module
jest.mock('../config.js', () => ({
  settingsManager: {
    getSettings: jest.fn(),
  },
}));

// Mock autogen-imports
jest.mock('../components/nodes/autogen-imports.js', () => {
  const { z } = require('zod');
  const nodeDefinitionMap = new Map();

  // Basic definitions needed for tests
  const genericDefinition = {
    dataSchema: z.object({}).passthrough(),
    validate: () => [],
  };

  nodeDefinitionMap.set('triggerNode', {
    ...genericDefinition,
    dataSchema: z.object({ selectedEventType: z.string() }),
  });

  nodeDefinitionMap.set('manualTriggerNode', {
    ...genericDefinition,
    dataSchema: z.object({ payload: z.string() }),
  });

  nodeDefinitionMap.set('stringNode', {
    ...genericDefinition,
    dataSchema: z.object({ value: z.string() }),
  });

  nodeDefinitionMap.set('runFlowNode', {
    ...genericDefinition,
    dataSchema: z.object({ flowId: z.string().optional() }),
  });

  nodeDefinitionMap.set('schemaNode', genericDefinition);

  return {
    registrator: {
      nodeDefinitionMap: {
        get: (key: string) => {
          if (nodeDefinitionMap.has(key)) {
            return nodeDefinitionMap.get(key);
          }
          if (key === 'unknownNodeType') {
            return undefined;
          }
          return genericDefinition;
        },
        has: (key: string) => key !== 'unknownNodeType',
      },
    },
  };
});

describe('validateFlow', () => {
  const mockAllFlows: FlowData[] = []; // empty for these tests
  beforeEach(() => {
    (settingsManager.getSettings as jest.Mock).mockReturnValue({
      flows: mockAllFlows,
    });
  });

  it('should return valid for a correct flow', () => {
    const flow: SpecFlow = {
      nodes: [
        {
          id: 'start',
          type: 'triggerNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        { id: 'end', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'hello' } },
      ],
      edges: [],
    };
    const { isValid, errors } = validateFlow(flow, true, mockAllFlows, generateUUID());
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('should invalidate a trigger node with an incoming edge', () => {
    const flow: SpecFlow = {
      nodes: [
        {
          id: 'start',
          type: 'triggerNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        { id: 'other', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'hello' } },
      ],
      edges: [{ id: 'e1', source: 'other', target: 'start', sourceHandle: null, targetHandle: null }],
    };
    const { isValid, errors } = validateFlow(flow, true, mockAllFlows, generateUUID());
    expect(isValid).toBe(false);
    expect(errors).toContain('Node [triggerNode]: Trigger nodes cannot have incoming connections.');
  });

  it('should invalidate a flow with a cycle', () => {
    const flow: SpecFlow = {
      nodes: [
        { id: 'a', type: 'stringNode', data: { value: '1' } },
        { id: 'b', type: 'stringNode', data: { value: '2' } },
        { id: 'c', type: 'stringNode', data: { value: '3' } },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', sourceHandle: null, targetHandle: null },
        { id: 'e2', source: 'b', target: 'c', sourceHandle: null, targetHandle: null },
        { id: 'e3', source: 'c', target: 'a', sourceHandle: null, targetHandle: null },
      ],
    };
    const { isValid, errors } = validateFlow(flow, true, mockAllFlows, generateUUID());
    expect(isValid).toBe(false);
    expect(errors).toContain('Flow has a cycle (circular dependency).');
  });

  it('should invalidate a node with incorrect data schema', () => {
    const flowWithBadType: SpecFlow = {
      nodes: [{ id: 'a', type: 'stringNode', data: { value: { an: 'object' } } }],
      edges: [],
    };

    const { isValid, errors, invalidNodeIds } = validateFlow(flowWithBadType, true, mockAllFlows, generateUUID());
    expect(isValid).toBe(false);
    expect(errors[0]).toContain('Node [stringNode]: Invalid input: expected string, received object');
    expect(invalidNodeIds.has('a')).toBe(true);
  });

  it('should invalidate an edge pointing to a non-existent node', () => {
    const flow: SpecFlow = {
      nodes: [{ id: 'a', type: 'stringNode', data: { value: 'hello' } }],
      edges: [{ id: 'e1', source: 'a', target: 'b', sourceHandle: null, targetHandle: null }],
    };
    const { isValid, errors, invalidEdgeIds } = validateFlow(flow, true, mockAllFlows, generateUUID());
    expect(isValid).toBe(false);
    expect(errors).toContain('Edge [e1]: Target node "b" not found.');
    expect(invalidEdgeIds.has('e1')).toBe(true);
  });

  it('should invalidate a node with an unknown type', () => {
    const flow: SpecFlow = {
      nodes: [{ id: 'a', type: 'unknownNodeType', data: {} }],
      edges: [],
    };
    const { isValid, errors, invalidNodeIds } = validateFlow(flow, true, mockAllFlows, generateUUID());
    expect(isValid).toBe(false);
    expect(errors).toContain('Node [unknownNodeType]: Unknown node type "unknownNodeType".');
    expect(invalidNodeIds.has('a')).toBe(true);
  });
});

describe('ManualTriggerNode validation', () => {
  const mockAllFlows: FlowData[] = [];
  it('should allow a connection to the schema handle of a ManualTriggerNode', () => {
    const flow: SpecFlow = {
      nodes: [
        { id: 'schema', type: 'schemaNode', data: {} },
        { id: 'trigger', type: 'manualTriggerNode', data: { payload: '{}' } },
      ],
      edges: [{ id: 'e1', source: 'schema', target: 'trigger', sourceHandle: 'result', targetHandle: 'schema' }],
    };
    const { isValid, errors } = validateFlow(flow, true, mockAllFlows, generateUUID());
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('should invalidate a connection to a non-schema handle of a ManualTriggerNode', () => {
    const flow: SpecFlow = {
      nodes: [
        { id: 'string', type: 'stringNode', data: { value: 'test' } },
        { id: 'trigger', type: 'manualTriggerNode', data: { payload: '{}' } },
      ],
      edges: [{ id: 'e1', source: 'string', target: 'trigger', sourceHandle: 'value', targetHandle: 'any_other' }],
    };
    const { isValid, errors } = validateFlow(flow, true, mockAllFlows, generateUUID());
    expect(isValid).toBe(false);
    expect(errors).toContain(
      `Node [manualTriggerNode]: This trigger can only accept incoming connections on the 'schema' handle.`,
    );
  });
});

describe('runFlowNode validation', () => {
  it('should validate a runFlowNode targeting a valid flow', () => {
    const flow1Spec: SpecFlow = {
      nodes: [{ id: 'a', type: 'runFlowNode', data: { flowId: 'flow2' } }],
      edges: [],
    };
    const mockAllFlows: FlowData[] = [
      { id: 'flow1', name: 'Flow 1', enabled: true, flow: flow1Spec, allowDangerousExecution: false, flowVersion: '' },
      {
        id: 'flow2',
        name: 'Flow 2',
        enabled: true,
        flow: { nodes: [], edges: [] },
        allowDangerousExecution: false,
        flowVersion: '',
      },
    ];
    (settingsManager.getSettings as jest.Mock).mockReturnValue({ flows: mockAllFlows });

    const { isValid, errors } = validateFlow(flow1Spec, true, mockAllFlows, 'flow1');
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('should invalidate a runFlowNode targeting a non-existent flow', () => {
    const flow1Spec: SpecFlow = {
      nodes: [{ id: 'a', type: 'runFlowNode', data: { flowId: 'non-existent-flow' } }],
      edges: [],
    };
    const mockAllFlows: FlowData[] = [
      { id: 'flow1', name: 'Flow 1', enabled: true, flow: flow1Spec, allowDangerousExecution: false, flowVersion: '' },
    ];
    (settingsManager.getSettings as jest.Mock).mockReturnValue({ flows: mockAllFlows });

    const { isValid, errors, invalidNodeIds } = validateFlow(flow1Spec, true, mockAllFlows, 'flow1');
    expect(isValid).toBe(false);
    expect(errors).toContain('Node [runFlowNode]: Targets a non-existent flow.');
    expect(invalidNodeIds.has('a')).toBe(true);
  });

  it('should invalidate a runFlowNode targeting a disabled flow', () => {
    const flow1Spec: SpecFlow = {
      nodes: [{ id: 'a', type: 'runFlowNode', data: { flowId: 'flow2' } }],
      edges: [],
    };
    const mockAllFlows: FlowData[] = [
      { id: 'flow1', name: 'Flow 1', enabled: true, flow: flow1Spec, allowDangerousExecution: false, flowVersion: '' },
      {
        id: 'flow2',
        name: 'Disabled Flow',
        enabled: false,
        flow: { nodes: [], edges: [] },
        allowDangerousExecution: false,
        flowVersion: '',
      },
    ];
    (settingsManager.getSettings as jest.Mock).mockReturnValue({ flows: mockAllFlows });

    const { isValid, errors, invalidNodeIds } = validateFlow(flow1Spec, true, mockAllFlows, 'flow1');
    expect(isValid).toBe(false);
    expect(errors).toContain('Node [runFlowNode]: Targets disabled flow: "Disabled Flow".');
    expect(invalidNodeIds.has('a')).toBe(true);
  });

  it('should invalidate a flow with a cross-flow cycle', () => {
    const flow1Spec: SpecFlow = {
      nodes: [{ id: 'a', type: 'runFlowNode', data: { flowId: 'flow2' } }],
      edges: [],
    };
    const flow2Spec: SpecFlow = {
      nodes: [{ id: 'b', type: 'runFlowNode', data: { flowId: 'flow1' } }],
      edges: [],
    };
    const mockAllFlows: FlowData[] = [
      { id: 'flow1', name: 'Flow 1', enabled: true, flow: flow1Spec, allowDangerousExecution: false, flowVersion: '' },
      { id: 'flow2', name: 'Flow 2', enabled: true, flow: flow2Spec, allowDangerousExecution: false, flowVersion: '' },
    ];
    (settingsManager.getSettings as jest.Mock).mockReturnValue({ flows: mockAllFlows });

    const { isValid, errors, invalidNodeIds } = validateFlow(flow1Spec, true, mockAllFlows, 'flow1');
    expect(isValid).toBe(false);
    expect(errors[0]).toContain('Circular sub-flow reference detected:');
    expect(invalidNodeIds.has('a')).toBe(true);
  });
});

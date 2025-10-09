import { validateFlow } from '../validator.js';
import { FlowData } from '../constants.js';

describe('validateFlow', () => {
  it('should return valid for an empty flow', () => {
    const flow: FlowData = { nodes: [], edges: [] };
    const { isValid, errors } = validateFlow(flow);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('should return valid for a simple valid flow', () => {
    const flow: FlowData = {
      nodes: [
        {
          id: '1',
          type: 'starterNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        { id: '2', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'test' } },
      ],
      edges: [{ id: 'e1-2', source: '1', target: '2', sourceHandle: null, targetHandle: null }],
    };
    const { isValid, errors } = validateFlow(flow);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('should return invalid for a node with invalid data', () => {
    const flow: FlowData = {
      nodes: [{ id: '1', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 123 } }], // value should be string
      edges: [],
    };
    const { isValid, errors } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Node [1 (stringNode)]: value - Invalid input: expected string, received number');
  });

  it('should return invalid for an unknown node type', () => {
    const flow: FlowData = {
      nodes: [{ id: '1', type: 'unknownNodeType', position: { x: 0, y: 0 }, data: {} }],
      edges: [],
    };
    const { isValid, errors } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe('Node [1]: Unknown node type "unknownNodeType".');
  });

  it('should return invalid for an edge with a non-existent source node', () => {
    const flow: FlowData = {
      nodes: [{ id: '2', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'test' } }],
      edges: [{ id: 'e1-2', source: '1', target: '2', sourceHandle: null, targetHandle: null }],
    };
    const { isValid, errors } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe('Edge [e1-2]: Source node "1" not found.');
  });

  it('should return invalid for an edge with a non-existent target node', () => {
    const flow: FlowData = {
      nodes: [
        {
          id: '1',
          type: 'starterNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
      ],
      edges: [{ id: 'e1-2', source: '1', target: '2', sourceHandle: null, targetHandle: null }],
    };
    const { isValid, errors } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe('Edge [e1-2]: Target node "2" not found.');
  });

  it('should return invalid for a flow with a cycle', () => {
    const flow: FlowData = {
      nodes: [
        { id: '1', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'a' } },
        { id: '2', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'b' } },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2', sourceHandle: null, targetHandle: null },
        { id: 'e2-1', source: '2', target: '1', sourceHandle: null, targetHandle: null },
      ],
    };
    const { isValid, errors } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors[0]).toBe('Flow has a cycle (circular dependency).');
  });

  it('should return invalid for a starter node with an incoming connection', () => {
    const flow: FlowData = {
      nodes: [
        {
          id: '1',
          type: 'starterNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        { id: '2', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'test' } },
      ],
      edges: [{ id: 'e2-1', source: '2', target: '1', sourceHandle: null, targetHandle: null }],
    };
    const { isValid, errors } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe('Starter Node [1] cannot have incoming connections.');
  });

  it('should handle multiple errors', () => {
    const flow: FlowData = {
      nodes: [
        {
          id: '1',
          type: 'starterNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        { id: '2', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 123 } }, // Invalid data
      ],
      edges: [
        { id: 'e1-3', source: '1', target: '3', sourceHandle: null, targetHandle: null }, // Invalid target
        { id: 'e2-1', source: '2', target: '1', sourceHandle: null, targetHandle: null }, // Starter node has incoming
      ],
    };
    const { isValid, errors } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors.length).toBeGreaterThan(1);
    expect(errors).toContain('Node [2 (stringNode)]: value - Invalid input: expected string, received number');
    expect(errors).toContain('Edge [e1-3]: Target node "3" not found.');
    expect(errors).toContain('Starter Node [1] cannot have incoming connections.');
  });
});

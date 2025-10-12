import { SpecFlow } from '../flow-spec.js';
import { validateFlow } from '../validator.js';

describe('validateFlow', () => {
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
    const { isValid, errors } = validateFlow(flow);
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
    const { isValid, errors } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors).toContain('Trigger Node [start] cannot have incoming connections.');
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
    const { isValid, errors } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors).toContain('Flow has a cycle (circular dependency).');
  });

  it('should invalidate a node with incorrect data schema', () => {
    const flow: SpecFlow = {
      nodes: [{ id: 'a', type: 'stringNode', data: { value: 123 } }], // value should be a string
      edges: [],
    };
    const { isValid, errors, invalidNodeIds } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors[0]).toContain('expected string, received number');
    expect(invalidNodeIds.has('a')).toBe(true);
  });

  it('should invalidate an edge pointing to a non-existent node', () => {
    const flow: SpecFlow = {
      nodes: [{ id: 'a', type: 'stringNode', data: { value: 'hello' } }],
      edges: [{ id: 'e1', source: 'a', target: 'b', sourceHandle: null, targetHandle: null }],
    };
    const { isValid, errors, invalidEdgeIds } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors).toContain('Edge [e1]: Target node "b" not found.');
    expect(invalidEdgeIds.has('e1')).toBe(true);
  });

  it('should invalidate a node with an unknown type', () => {
    const flow: SpecFlow = {
      nodes: [{ id: 'a', type: 'unknownNodeType', data: {} }],
      edges: [],
    };
    const { isValid, errors, invalidNodeIds } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors).toContain('Node [a]: Unknown node type "unknownNodeType".');
    expect(invalidNodeIds.has('a')).toBe(true);
  });
});

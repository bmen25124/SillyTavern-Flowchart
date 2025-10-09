import { validateFlow } from '../validator.js';
import { FlowData } from '../constants.js';

describe('validateFlow', () => {
  it('should return valid for a correct flow', () => {
    const flow: FlowData = {
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
    const flow: FlowData = {
      nodes: [
        {
          id: 'start',
          type: 'triggerNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        { id: 'other', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'hello' } },
      ],
      edges: [{ id: 'e1', source: 'other', target: 'start' }],
    };
    const { isValid, errors } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors).toContain('Trigger Node [start] cannot have incoming connections.');
  });

  it('should invalidate a trigger node with an outgoing edge', () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'start',
          type: 'triggerNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        { id: 'end', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'hello' } },
      ],
      edges: [{ id: 'e1', source: 'start', target: 'end' }],
    };
    const { isValid, errors } = validateFlow(flow);
    expect(isValid).toBe(false);
    expect(errors).toContain('Trigger Node [start] cannot have outgoing connections.');
  });
});

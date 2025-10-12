import { Node, Edge } from '@xyflow/react';
import { checkConnectionValidity } from '../../utils/connection-logic.js';
import { FlowDataType } from '../../flow-types.js';

describe('checkConnectionValidity', () => {
  const nodes: Node[] = [
    { id: 'stringOut', type: 'stringNode', position: { x: 0, y: 0 }, data: {} },
    { id: 'numberOut', type: 'numberNode', position: { x: 0, y: 0 }, data: {} },
    { id: 'anyOut', type: 'logNode', position: { x: 0, y: 0 }, data: {} },
    { id: 'profileIdOut', type: 'profileIdNode', position: { x: 0, y: 0 }, data: {} },

    { id: 'stringIn', type: 'logNode', position: { x: 0, y: 0 }, data: {} },
    { id: 'numberIn', type: 'mathNode', position: { x: 0, y: 0 }, data: {} },
    { id: 'anyIn', type: 'logNode', position: { x: 0, y: 0 }, data: {} },
  ];
  const edges: Edge[] = [];

  it('should allow matching types (string -> string)', () => {
    const connection = { source: 'stringOut', sourceHandle: 'value', target: 'stringIn', targetHandle: 'value' };
    const isValid = checkConnectionValidity(connection, nodes, edges);
    expect(isValid).toBe(true);
  });

  it('should prevent mismatched types (string -> number)', () => {
    const connection = { source: 'stringOut', sourceHandle: 'value', target: 'numberIn', targetHandle: 'a' };
    const isValid = checkConnectionValidity(connection, nodes, edges);
    expect(isValid).toBe(false);
  });

  it('should allow connections to an ANY type input', () => {
    const connection = { source: 'numberOut', sourceHandle: 'value', target: 'anyIn', targetHandle: 'value' };
    const isValid = checkConnectionValidity(connection, nodes, edges);
    expect(isValid).toBe(true);
  });

  it('should allow connections from an ANY type output', () => {
    const connection = { source: 'anyOut', sourceHandle: 'value', target: 'stringIn', targetHandle: 'value' };
    const isValid = checkConnectionValidity(connection, nodes, edges);
    expect(isValid).toBe(true);
  });

  it('should allow special case: PROFILE_ID to STRING', () => {
    const connection = { source: 'profileIdOut', sourceHandle: null, target: 'stringIn', targetHandle: 'value' };
    const isValid = checkConnectionValidity(connection, nodes, edges);
    expect(isValid).toBe(true);
  });
});

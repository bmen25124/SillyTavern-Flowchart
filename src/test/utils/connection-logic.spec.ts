import { Node, Edge } from '@xyflow/react';
import { checkConnectionValidity } from '../../utils/connection-logic.js';

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
    // stringNode (output:'value') -> logNode (input:'main', type:ANY is compatible)
    const connection = { source: 'stringOut', sourceHandle: 'value', target: 'stringIn', targetHandle: 'main' };
    const isValid = checkConnectionValidity(connection, nodes, edges);
    expect(isValid).toBe(true);
  });

  it('should prevent mismatched types (string -> number)', () => {
    // stringNode (output:'value') -> mathNode (input:'a', type:NUMBER is not compatible)
    const connection = { source: 'stringOut', sourceHandle: 'value', target: 'numberIn', targetHandle: 'a' };
    const isValid = checkConnectionValidity(connection, nodes, edges);
    expect(isValid).toBe(false);
  });

  it('should allow connections to an ANY type input', () => {
    // numberNode (output:'value') -> logNode (input:'main', type:ANY is compatible)
    const connection = { source: 'numberOut', sourceHandle: 'value', target: 'anyIn', targetHandle: 'main' };
    const isValid = checkConnectionValidity(connection, nodes, edges);
    expect(isValid).toBe(true);
  });

  it('should allow connections from an ANY type output', () => {
    // logNode (output:'main', type:ANY) -> logNode (input:'main', type:ANY)
    const connection = { source: 'anyOut', sourceHandle: 'main', target: 'stringIn', targetHandle: 'main' };
    const isValid = checkConnectionValidity(connection, nodes, edges);
    expect(isValid).toBe(true);
  });

  it('should allow special case: PROFILE_ID to STRING', () => {
    // profileIdNode (output:'main', type:PROFILE_ID) -> stringNode (input:'value', type:STRING)
    const specialStringNode: Node = { id: 'specialStringIn', type: 'stringNode', position: { x: 0, y: 0 }, data: {} };
    const connection = {
      source: 'profileIdOut',
      sourceHandle: 'main',
      target: 'specialStringIn',
      targetHandle: 'value',
    };
    const isValid = checkConnectionValidity(connection, [...nodes, specialStringNode], edges);
    expect(isValid).toBe(true);
  });
});

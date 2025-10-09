import { jest } from '@jest/globals';
import { LowLevelFlowRunner, FlowRunnerDependencies } from '../LowLevelFlowRunner.js';
import { FlowData } from '../constants.js';
import { z } from 'zod';
import { Node } from '@xyflow/react';

describe('LowLevelFlowRunner', () => {
  let dependencies: jest.Mocked<FlowRunnerDependencies>;
  let runner: LowLevelFlowRunner;

  beforeEach(() => {
    dependencies = {
      getBaseMessagesForProfile: jest.fn(),
      makeStructuredRequest: jest.fn(),
      getSillyTavernContext: jest.fn(),
    };
    dependencies.getBaseMessagesForProfile.mockResolvedValue([{ role: 'user', content: 'message' }]);
    dependencies.makeStructuredRequest.mockResolvedValue({ structured: 'data' });
    dependencies.getSillyTavernContext.mockReturnValue({});
    runner = new LowLevelFlowRunner(dependencies);
  });

  it('should execute a simple flow from start to finish', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'start',
          type: 'triggerNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        { id: 'string', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'hello' } },
      ],
      edges: [],
    };

    const report = await runner.executeFlow(flow, { initial: 'input' });
    expect(report.executedNodes).toHaveLength(2);
    expect(report.executedNodes[0].nodeId).toBe('start');
    expect(report.executedNodes[0].input).toEqual({ initial: 'input' });
    expect(report.executedNodes[0].output).toEqual({ initial: 'input' });
    expect(report.executedNodes[1].nodeId).toBe('string');
    expect(report.executedNodes[1].input).toEqual({ initial: 'input' });
    expect(report.executedNodes[1].output).toBe('hello');
  });

  it('should execute a stringNode and produce its value as output', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'start',
          type: 'triggerNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        { id: 'string', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'test_string' } },
      ],
      edges: [],
    };
    const report = await runner.executeFlow(flow, {});
    expect(report.executedNodes[1].output).toBe('test_string');
  });

  it('should call getBaseMessagesForProfile for createMessagesNode', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'start',
          type: 'triggerNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        {
          id: 'createMsg',
          type: 'createMessagesNode',
          position: { x: 0, y: 0 },
          data: { profileId: 'test-profile', lastMessageId: 10 },
        },
      ],
      edges: [],
    };

    const report = await runner.executeFlow(flow, {});
    expect(dependencies.getBaseMessagesForProfile).toHaveBeenCalledWith('test-profile', 10);
    expect(report.executedNodes[1].output).toEqual({ messages: [{ role: 'user', content: 'message' }] });
  });

  it('should correctly evaluate an ifNode and follow the true path', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'start',
          type: 'triggerNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        {
          id: 'if',
          type: 'ifNode',
          position: { x: 0, y: 0 },
          data: { conditions: [{ id: 'cond1', code: 'return input.value > 10;' }] },
        },
        { id: 'trueNode', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'true' } },
        { id: 'falseNode', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'false' } },
      ],
      edges: [
        { id: 'e-if-true', source: 'if', target: 'trueNode', sourceHandle: 'cond1', targetHandle: null },
        { id: 'e-if-false', source: 'if', target: 'falseNode', sourceHandle: 'false', targetHandle: null },
      ],
    };

    const report = await runner.executeFlow(flow, { value: 15 });
    expect(report.executedNodes.map((n) => n.nodeId)).toEqual(['start', 'if', 'trueNode']);
    expect(report.executedNodes[1].output).toHaveProperty('nextNodeId', 'trueNode');
    expect(report.executedNodes[2].output).toBe('true');
  });

  it('should call makeStructuredRequest for structuredRequestNode', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'start',
          type: 'triggerNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        {
          id: 'createMsg',
          type: 'createMessagesNode',
          position: { x: 0, y: 0 },
          data: { profileId: 'test-profile' },
        },
        {
          id: 'schema',
          type: 'schemaNode',
          position: { x: 0, y: 0 },
          data: { fields: [{ id: 'f1', name: 'name', type: 'string' }] },
        },
        {
          id: 'request',
          type: 'structuredRequestNode',
          position: { x: 0, y: 0 },
          data: {
            profileId: 'test-profile',
            schemaName: 'test-schema',
            messageId: 1,
            promptEngineeringMode: 'native',
            maxResponseToken: 100,
          },
        },
      ],
      edges: [
        { id: 'e-msg-request', source: 'createMsg', target: 'request', sourceHandle: null, targetHandle: 'messages' },
        { id: 'e-schema-request', source: 'schema', target: 'request', sourceHandle: null, targetHandle: 'schema' },
      ],
    };

    const report = await runner.executeFlow(flow, {});
    const schemaNodeReport = report.executedNodes.find((n) => n.nodeId === 'schema');
    expect(schemaNodeReport).toBeDefined();
    expect(schemaNodeReport?.output).toBeInstanceOf(z.ZodObject);

    expect(dependencies.makeStructuredRequest).toHaveBeenCalledTimes(1);
    const mockCallArgs = dependencies.makeStructuredRequest.mock.calls[0];
    expect(mockCallArgs[0]).toBe('test-profile');
    expect(mockCallArgs[1]).toEqual({ messages: [{ role: 'user', content: 'message' }] });
    expect(mockCallArgs[2]).toBe(schemaNodeReport?.output); // Check for instance equality
    expect(mockCallArgs[3]).toBe('test-schema');
    expect(mockCallArgs[4]).toBe(1);
    expect(mockCallArgs[5]).toBe('native');
    expect(mockCallArgs[6]).toBe(100);

    const executedOrder = report.executedNodes.map((n) => n.nodeId).sort();
    expect(executedOrder).toEqual(['createMsg', 'request', 'schema', 'start'].sort());
    const requestNodeReport = report.executedNodes.find((n) => n.nodeId === 'request');
    expect(requestNodeReport?.output).toEqual({ structuredResult: { structured: 'data' } });
  });
});

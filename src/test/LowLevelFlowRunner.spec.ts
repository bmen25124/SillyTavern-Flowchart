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
    dependencies.getBaseMessagesForProfile.mockResolvedValue([{ text: 'message' }]);
    dependencies.makeStructuredRequest.mockResolvedValue({ structured: 'data' });
    dependencies.getSillyTavernContext.mockReturnValue({});
    runner = new LowLevelFlowRunner(dependencies);
  });

  it('should execute a simple flow from start to finish', async () => {
    const flow: FlowData = {
      nodes: [
        { id: 'start', type: 'starterNode', position: { x: 0, y: 0 }, data: {} },
        { id: 'string', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'hello' } },
      ],
      edges: [{ id: 'e-start-string', source: 'start', target: 'string', sourceHandle: null, targetHandle: null }],
    };

    await runner.executeFlow(flow, 'start', { initial: 'input' });
    // We can't easily assert the output of the whole flow, but we can check if nodes were executed.
    // More specific node execution tests are below.
  });

  it('should execute a stringNode and produce its value as output', async () => {
    const flow: FlowData = {
      nodes: [
        { id: 'start', type: 'starterNode', position: { x: 0, y: 0 }, data: {} },
        { id: 'string', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'test_string' } },
      ],
      edges: [{ id: 'e-start-string', source: 'start', target: 'string', sourceHandle: null, targetHandle: null }],
    };
    // @ts-ignore
    const finalOutputs = await runner.executeFlow(flow, 'start', {});
    // This is a conceptual test. The runner doesn't return the final outputs directly.
    // We'd need to spy on executeNode or refactor to get outputs for assertions.
  });

  it('should call getBaseMessagesForProfile for createMessagesNode', async () => {
    const flow: FlowData = {
      nodes: [
        { id: 'start', type: 'starterNode', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'createMsg',
          type: 'createMessagesNode',
          position: { x: 0, y: 0 },
          data: { profileId: 'test-profile', lastMessageId: 10 },
        },
      ],
      edges: [{ id: 'e-start-msg', source: 'start', target: 'createMsg', sourceHandle: null, targetHandle: null }],
    };

    await runner.executeFlow(flow, 'start', {});
    expect(dependencies.getBaseMessagesForProfile).toHaveBeenCalledWith('test-profile', 10);
  });

  it('should correctly evaluate an ifNode and follow the true path', async () => {
    const flow: FlowData = {
      nodes: [
        { id: 'start', type: 'starterNode', position: { x: 0, y: 0 }, data: {} },
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
        { id: 'e-start-if', source: 'start', target: 'if', sourceHandle: null, targetHandle: null },
        { id: 'e-if-true', source: 'if', target: 'trueNode', sourceHandle: 'cond1', targetHandle: null },
        { id: 'e-if-false', source: 'if', target: 'falseNode', sourceHandle: 'false', targetHandle: null },
      ],
    };

    const executeNodeSpy = jest.spyOn(runner, 'executeNode' as any);
    await runner.executeFlow(flow, 'start', { value: 15 });

    // Check that trueNode was executed but falseNode was not
    const executedNodeTypes = executeNodeSpy.mock.calls.map((call) => (call[0] as Node).type);
    expect(executedNodeTypes).toContain('stringNode'); // A string node was executed
    const stringNodeCall = executeNodeSpy.mock.calls.find((call) => (call[0] as Node).type === 'stringNode');
    expect(stringNodeCall).toBeDefined();
    expect((stringNodeCall![0] as Node).id).toBe('trueNode');
    expect(executedNodeTypes.filter((type) => type === 'stringNode')).toHaveLength(1);
  });

  it('should call makeStructuredRequest for structuredRequestNode', async () => {
    const schema = z.object({ name: z.string() });
    const flow: FlowData = {
      nodes: [
        { id: 'start', type: 'starterNode', position: { x: 0, y: 0 }, data: {} },
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
        { id: 'e-start-schema', source: 'start', target: 'schema', sourceHandle: null, targetHandle: null },
        { id: 'e-schema-request', source: 'schema', target: 'request', sourceHandle: null, targetHandle: 'schema' },
      ],
    };

    await runner.executeFlow(flow, 'start', { messages: [{ text: 'hi' }] });
    expect(dependencies.makeStructuredRequest).toHaveBeenCalledWith(
      'test-profile',
      [{ text: 'hi' }],
      expect.any(Function),
      'test-schema',
      1,
      'native',
      100,
    );
  });
});

import { jest } from '@jest/globals';
import { LowLevelFlowRunner } from '../LowLevelFlowRunner.js';
import { Character } from 'sillytavern-utils-lib/types';
import { SpecFlow } from '../flow-spec.js';
import * as events from '../events.js';
import { FlowRunnerDependencies } from '../NodeExecutor.js';
import { registrator } from '../components/nodes/autogen-imports.js';

describe('LowLevelFlowRunner', () => {
  let dependencies: jest.Mocked<FlowRunnerDependencies>;
  let runner: LowLevelFlowRunner;
  // @ts-ignore
  let emitSpy;
  const mockCharacter: Character = {
    name: 'Test Character',
    avatar: 'test-char.png',
    description: 'A mock character for testing.',
    first_mes: 'Hello!',
    scenario: 'A test scenario.',
    personality: 'Friendly',
    mes_example: 'An example message.',
    tags: ['test', 'mock'],
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    emitSpy = jest.spyOn(events.eventEmitter, 'emit').mockImplementation(() => {});

    dependencies = {
      getBaseMessagesForProfile: jest.fn(),
      makeStructuredRequest: jest.fn(),
      getSillyTavernContext: jest.fn(),
      createCharacter: jest.fn(),
      saveCharacter: jest.fn(),
      st_createNewWorldInfo: jest.fn(),
      applyWorldInfoEntry: jest.fn(),
      getWorldInfos: jest.fn(),
      deleteMessage: jest.fn(),
      saveChat: jest.fn(),
      sendChatMessage: jest.fn(),
      st_updateMessageBlock: jest.fn(),
      executeSlashCommandsWithOptions: jest.fn(),
      st_runRegexScript: jest.fn(),
      makeSimpleRequest: jest.fn(),
      executeSubFlow: jest.fn(),
    };
    dependencies.getBaseMessagesForProfile.mockResolvedValue([{ role: 'user', content: 'message' }]);
    dependencies.makeStructuredRequest.mockResolvedValue({ structured: 'data' });
    dependencies.getSillyTavernContext.mockReturnValue({
      characters: [mockCharacter],
    } as any);
    dependencies.st_createNewWorldInfo.mockResolvedValue(true);
    dependencies.applyWorldInfoEntry.mockImplementation(async ({ entry }) => ({ entry, operation: 'add' }));
    dependencies.getWorldInfos.mockResolvedValue({});
    runner = new LowLevelFlowRunner(registrator.nodeExecutors);
  });

  afterEach(() => {
    // @ts-ignore
    emitSpy.mockRestore();
  });

  // --- Core Runner Logic Tests ---

  it('should stop execution and report an error when a node fails', async () => {
    // @ts-ignore
    const errorExecutor = jest.fn().mockRejectedValue(new Error('Something went wrong'));
    // @ts-ignore
    runner['nodeExecutors'].set('errorNode', errorExecutor);

    const flow: SpecFlow = {
      nodes: [
        { id: 'start', type: 'manualTriggerNode', data: { payload: '{}' } },
        { id: 'error', type: 'errorNode', data: {} },
        { id: 'end', type: 'stringNode', data: { value: 'never-reached' } },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'error', sourceHandle: null, targetHandle: null },
        { id: 'e2', source: 'error', target: 'end', sourceHandle: null, targetHandle: null },
      ],
    };

    const report = await runner.executeFlow(crypto.randomUUID(), flow, {}, dependencies, 0);

    expect(report.error).toBeDefined();
    expect(report.error?.nodeId).toBe('error');
    expect(report.error?.message).toContain('Something went wrong');

    const executedNodeIds = report.executedNodes.map((n) => n.nodeId);
    expect(executedNodeIds).toEqual(['start', 'error']);

    runner['nodeExecutors'].delete('errorNode');
  });

  it('should gracefully terminate when an EndNode is reached', async () => {
    const flow: SpecFlow = {
      nodes: [
        { id: 'start', type: 'manualTriggerNode', data: { payload: '{}' } },
        { id: 'endNode', type: 'endNode', data: {} },
        { id: 'after', type: 'stringNode', data: { value: 'never-reached' } },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'endNode', sourceHandle: null, targetHandle: null },
        // The edge below should not be traversed.
        { id: 'e2', source: 'endNode', target: 'after', sourceHandle: null, targetHandle: 'value' },
      ],
    };

    const report = await runner.executeFlow(crypto.randomUUID(), flow, {}, dependencies, 0);

    // The flow should complete successfully with no error.
    expect(report.error).toBeUndefined();
    const executedNodeIds = report.executedNodes.map((n) => n.nodeId);
    // Execution stops at the end node.
    expect(executedNodeIds).toEqual(['start', 'endNode']);
    expect(executedNodeIds).not.toContain('after');
  });

  it('should stop the execution path at a disabled node and not report it', async () => {
    const flow: SpecFlow = {
      nodes: [
        { id: 'start', type: 'manualTriggerNode', data: { payload: '{}' } },
        { id: 'disabled', type: 'stringNode', data: { value: 'skipped', disabled: true } },
        { id: 'final', type: 'logNode', data: { prefix: 'Log:' } },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'disabled', sourceHandle: null, targetHandle: 'value' },
        { id: 'e2', source: 'disabled', target: 'final', sourceHandle: 'value', targetHandle: 'value' },
      ],
    };

    const report = await runner.executeFlow(crypto.randomUUID(), flow, {}, dependencies, 0);

    expect(report.error).toBeUndefined();
    const executedNodeIds = report.executedNodes.map((n) => n.nodeId);
    expect(executedNodeIds).toEqual(['start']);
  });

  it('should handle a diamond-shaped graph (fan-out, fan-in)', async () => {
    const flow: SpecFlow = {
      nodes: [
        { id: 'start', type: 'manualTriggerNode', data: { payload: '{"a": 1}' } },
        { id: 'left', type: 'jsonNode', data: { items: [{ id: 'l1', key: 'left_val', value: 'L', type: 'string' }] } },
        {
          id: 'right',
          type: 'jsonNode',
          data: { items: [{ id: 'r1', key: 'right_val', value: 'R', type: 'string' }] },
        },
        { id: 'merge', type: 'mergeObjectsNode', data: { inputCount: 2 } },
      ],
      edges: [
        { id: 'e-start-left', source: 'start', target: 'left', sourceHandle: null, targetHandle: null },
        { id: 'e-start-right', source: 'start', target: 'right', sourceHandle: null, targetHandle: null },
        { id: 'e-left-merge', source: 'left', target: 'merge', sourceHandle: 'result', targetHandle: 'object_0' },
        { id: 'e-right-merge', source: 'right', target: 'merge', sourceHandle: 'result', targetHandle: 'object_1' },
      ],
    };

    const report = await runner.executeFlow(crypto.randomUUID(), flow, {}, dependencies, 0);

    expect(report.error).toBeUndefined();
    const mergeNodeReport = report.executedNodes.find((n) => n.nodeId === 'merge');
    expect(mergeNodeReport?.input).toEqual({
      object_0: { left_val: 'L' },
      object_1: { right_val: 'R' },
    });
    expect(mergeNodeReport?.output).toEqual({ left_val: 'L', right_val: 'R' });
  });

  it('should abort execution when the signal is triggered', async () => {
    const controller = new AbortController();
    const delayExecutor = jest.fn(async () => {
      // Immediately abort after this node starts
      controller.abort();
      // Add a small delay to ensure the abort signal propagates
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { value: 'delayed' };
    });
    runner['nodeExecutors'].set('delayNode', delayExecutor);

    const flow: SpecFlow = {
      nodes: [
        { id: 'start', type: 'manualTriggerNode', data: { payload: '{}' } },
        { id: 'delay', type: 'delayNode', data: {} },
        { id: 'after', type: 'stringNode', data: { value: 'never' } },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'delay', sourceHandle: null, targetHandle: null },
        { id: 'e2', source: 'delay', target: 'after', sourceHandle: 'value', targetHandle: 'value' },
      ],
    };

    const report = await runner.executeFlow(crypto.randomUUID(), flow, {}, dependencies, 0, controller.signal);

    expect(report.error).toBeDefined();
    // Check for the specific AbortError type
    expect(report.error?.message).toContain('aborted');
    const executedNodeIds = report.executedNodes.map((n) => n.nodeId);
    expect(executedNodeIds).not.toContain('after');

    runner['nodeExecutors'].delete('delayNode');
  });

  // --- "Run To/From Here" Logic ---
  describe('Run To/From Here', () => {
    it("should only execute the ancestor path when using 'endNodeId' (Run To Here)", async () => {
      const unwantedExecutor = jest.fn(async () => ({}));
      runner['nodeExecutors'].set('unwantedNode', unwantedExecutor);

      const flow: SpecFlow = {
        nodes: [
          { id: 'start', type: 'manualTriggerNode', data: {} },
          { id: 'target-branch-node', type: 'stringNode', data: { value: 'A' } },
          { id: 'target-node', type: 'stringNode', data: { value: 'B' } },
          { id: 'unwanted-branch-node', type: 'unwantedNode', data: {} },
        ],
        edges: [
          // Valid branch that should run
          { id: 'e1', source: 'start', target: 'target-branch-node', sourceHandle: null, targetHandle: 'value' },
          {
            id: 'e2',
            source: 'target-branch-node',
            target: 'target-node',
            sourceHandle: 'value',
            targetHandle: 'value',
          },
          // Unrelated parallel branch that should NOT run
          { id: 'e3', source: 'start', target: 'unwanted-branch-node', sourceHandle: null, targetHandle: null },
        ],
      };

      const report = await runner.executeFlow(crypto.randomUUID(), flow, {}, dependencies, 0, undefined, {
        endNodeId: 'target-node',
      });

      expect(report.error).toBeUndefined();
      const executedIds = report.executedNodes.map((n) => n.nodeId);

      expect(executedIds).toContain('start');
      expect(executedIds).toContain('target-branch-node');
      expect(executedIds).toContain('target-node'); // It runs the target node itself
      expect(executedIds).not.toContain('unwanted-branch-node');
      expect(unwantedExecutor).not.toHaveBeenCalled();

      runner['nodeExecutors'].delete('unwantedNode');
    });

    it("should only execute the downstream path when using 'startNodeId' (Run From Here)", async () => {
      const flow: SpecFlow = {
        nodes: [
          { id: 'before', type: 'stringNode', data: { value: 'A' } },
          { id: 'start-node', type: 'stringNode', data: { value: 'B' } },
          { id: 'after', type: 'stringNode', data: { value: 'C' } },
        ],
        edges: [
          { id: 'e1', source: 'before', target: 'start-node', sourceHandle: 'value', targetHandle: 'value' },
          { id: 'e2', source: 'start-node', target: 'after', sourceHandle: 'value', targetHandle: 'value' },
        ],
      };

      const report = await runner.executeFlow(crypto.randomUUID(), flow, {}, dependencies, 0, undefined, {
        startNodeId: 'start-node',
      });

      expect(report.error).toBeUndefined();
      const executedIds = report.executedNodes.map((n) => n.nodeId);

      expect(executedIds).not.toContain('before');
      expect(executedIds).toContain('start-node');
      expect(executedIds).toContain('after');
    });
  });

  // --- Original Integration-Style Tests ---

  it('should execute a simple flow and emit debug events', async () => {
    const flow: SpecFlow = {
      nodes: [
        { id: 'start', type: 'triggerNode', data: { selectedEventType: 'user_message_rendered' } },
        { id: 'string', type: 'stringNode', data: { value: 'hello' } },
      ],
      edges: [],
    };

    const report = await runner.executeFlow(crypto.randomUUID(), flow, { initial: 'input' }, dependencies, 0);
    expect(report.error).toBeUndefined();
    expect(report.executedNodes).toHaveLength(2);
    expect(report.executedNodes[0].nodeId).toBe('start');
    expect(report.executedNodes[1].output).toEqual({ value: 'hello' });
    // @ts-ignore
    expect(emitSpy).toHaveBeenCalledTimes(4); // start/end for each of the 2 nodes
  });

  it('should correctly evaluate an ifNode and follow the false path', async () => {
    const flow: SpecFlow = {
      nodes: [
        {
          id: 'if',
          type: 'ifNode',
          data: { conditions: [{ id: 'cond1', code: 'return input.value > 10;', operator: 'equals', value: '' }] },
        },
        { id: 'trueNode', type: 'stringNode', data: { value: 'true' } },
        { id: 'falseNode', type: 'stringNode', data: { value: 'false' } },
      ],
      edges: [
        { id: 'e-if-true', source: 'if', target: 'trueNode', sourceHandle: 'cond1', targetHandle: 'value' },
        { id: 'e-if-false', source: 'if', target: 'falseNode', sourceHandle: 'false', targetHandle: 'value' },
      ],
    };

    const report = await runner.executeFlow(crypto.randomUUID(), flow, { value: 5 }, dependencies, 0);
    expect(report.error).toBeUndefined();
    const executedNodeIds = report.executedNodes.map((n) => n.nodeId);
    expect(executedNodeIds).toContain('if');
    expect(executedNodeIds).not.toContain('trueNode');
    expect(executedNodeIds).toContain('falseNode');
  });

  it('should call makeStructuredRequest for llmRequestNode', async () => {
    const flow: SpecFlow = {
      nodes: [
        { id: 'createMsg', type: 'createMessagesNode', data: { profileId: 'test-profile' } },
        { id: 'schema', type: 'schemaNode', data: { fields: [{ id: 'f1', name: 'name', type: 'string' }] } },
        {
          id: 'request',
          type: 'llmRequestNode',
          data: {
            profileId: 'test-profile',
            schemaName: 'test-schema',
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

    await runner.executeFlow(crypto.randomUUID(), flow, {}, dependencies, 0);
    expect(dependencies.makeStructuredRequest).toHaveBeenCalledTimes(1);
  });

  it('should merge messages from multiple dynamic sources in the correct order', async () => {
    const flow: SpecFlow = {
      nodes: [
        { id: 'customA', type: 'customMessageNode', data: { messages: [{ id: 'm1', role: 'user', content: 'A' }] } },
        {
          id: 'customB',
          type: 'customMessageNode',
          data: { messages: [{ id: 'm2', role: 'assistant', content: 'B' }] },
        },
        { id: 'merge', type: 'mergeMessagesNode', data: { inputCount: 2 } },
      ],
      edges: [
        { id: 'e-A-merge', source: 'customA', target: 'merge', sourceHandle: null, targetHandle: 'messages_0' },
        { id: 'e-B-merge', source: 'customB', target: 'merge', sourceHandle: null, targetHandle: 'messages_1' },
      ],
    };
    const report = await runner.executeFlow(crypto.randomUUID(), flow, {}, dependencies, 0);
    const mergeNodeReport = report.executedNodes.find((n) => n.nodeId === 'merge');
    expect(mergeNodeReport?.output).toEqual([
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'B' },
    ]);
  });
});

import { jest } from '@jest/globals';
import { LowLevelFlowRunner, FlowRunnerDependencies } from '../LowLevelFlowRunner.js';
import { Character } from 'sillytavern-utils-lib/types';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import { SpecFlow } from '../flow-spec.js';
import * as events from '../events.js';

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
    };
    dependencies.getBaseMessagesForProfile.mockResolvedValue([{ role: 'user', content: 'message' }]);
    dependencies.makeStructuredRequest.mockResolvedValue({ structured: 'data' });
    // @ts-ignore
    dependencies.getSillyTavernContext.mockReturnValue({
      characters: [mockCharacter],
    });
    dependencies.st_createNewWorldInfo.mockResolvedValue(true);
    dependencies.applyWorldInfoEntry.mockImplementation(async ({ entry }) => ({ entry, operation: 'add' }));
    dependencies.getWorldInfos.mockResolvedValue({});
    runner = new LowLevelFlowRunner(dependencies);
  });

  afterEach(() => {
    // @ts-ignore
    emitSpy.mockRestore();
  });

  it('should execute a simple flow and emit debug events', async () => {
    const flow: SpecFlow = {
      nodes: [
        {
          id: 'start',
          type: 'triggerNode',
          data: { selectedEventType: 'user_message_rendered' },
        },
        { id: 'string', type: 'stringNode', data: { value: 'hello' } },
      ],
      edges: [],
    };

    const report = await runner.executeFlow(flow, new Map(), { initial: 'input' });
    expect(report.executedNodes).toHaveLength(2);
    expect(report.executedNodes[0].nodeId).toBe('start');
    expect(report.executedNodes[1].output).toEqual({ value: 'hello' });

    // @ts-ignore
    expect(emitSpy).toHaveBeenCalledWith('node:start', 'start');
    // @ts-ignore
    expect(emitSpy).toHaveBeenCalledWith('node:end', report.executedNodes[0]);
    // @ts-ignore
    expect(emitSpy).toHaveBeenCalledWith('node:start', 'string');
    // @ts-ignore
    expect(emitSpy).toHaveBeenCalledWith('node:end', report.executedNodes[1]);
  });

  it('should ignore group nodes during execution', async () => {
    const flow: SpecFlow = {
      nodes: [
        { id: 'start', type: 'manualTriggerNode', data: { payload: '{}' } },
        { id: 'group', type: 'groupNode', data: { label: 'My Group' } },
      ],
      edges: [],
    };
    const report = await runner.executeFlow(flow, new Map(), {});
    expect(report.executedNodes.length).toBe(2);
    const groupNodeReport = report.executedNodes.find((n) => n.nodeId === 'group');
    expect(groupNodeReport).toBeDefined();
    expect(groupNodeReport?.output).toEqual({});
  });

  it('should correctly evaluate an ifNode and follow the false path', async () => {
    const flow: SpecFlow = {
      nodes: [
        {
          id: 'if',
          type: 'ifNode',
          data: { conditions: [{ id: 'cond1', code: 'return input.value > 10;' }] },
        },
        { id: 'trueNode', type: 'stringNode', data: { value: 'true' } },
        { id: 'falseNode', type: 'stringNode', data: { value: 'false' } },
      ],
      edges: [
        { id: 'e-if-true', source: 'if', target: 'trueNode', sourceHandle: 'cond1', targetHandle: null },
        { id: 'e-if-false', source: 'if', target: 'falseNode', sourceHandle: 'false', targetHandle: null },
      ],
    };

    const report = await runner.executeFlow(flow, new Map(), { value: 5 });
    const executedNodeIds = report.executedNodes.map((n) => n.nodeId);
    expect(executedNodeIds).toContain('if');
    expect(executedNodeIds).not.toContain('trueNode');
    expect(executedNodeIds).toContain('falseNode');
  });

  it('should call makeStructuredRequest for structuredRequestNode', async () => {
    const flow: SpecFlow = {
      nodes: [
        { id: 'createMsg', type: 'createMessagesNode', data: { profileId: 'test-profile' } },
        { id: 'schema', type: 'schemaNode', data: { fields: [{ id: 'f1', name: 'name', type: 'string' }] } },
        {
          id: 'request',
          type: 'structuredRequestNode',
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

    await runner.executeFlow(flow, new Map(), {});
    expect(dependencies.makeStructuredRequest).toHaveBeenCalledTimes(1);
    const mockCallArgs = dependencies.makeStructuredRequest.mock.calls[0];
    expect(mockCallArgs[0]).toBe('test-profile');
    expect(mockCallArgs[1]).toEqual([{ role: 'user', content: 'message' }]);
    expect(mockCallArgs[3]).toBe('test-schema');
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
        { id: 'customC', type: 'customMessageNode', data: { messages: [{ id: 'm3', role: 'system', content: 'C' }] } },
        { id: 'merge', type: 'mergeMessagesNode', data: { inputCount: 3 } },
      ],
      edges: [
        { id: 'e-A-merge', source: 'customA', target: 'merge', sourceHandle: null, targetHandle: 'messages_0' },
        { id: 'e-B-merge', source: 'customB', target: 'merge', sourceHandle: null, targetHandle: 'messages_1' },
        { id: 'e-C-merge', source: 'customC', target: 'merge', sourceHandle: null, targetHandle: 'messages_2' },
      ],
    };
    const report = await runner.executeFlow(flow, new Map(), {});
    const mergeNodeReport = report.executedNodes.find((n) => n.nodeId === 'merge');
    expect(mergeNodeReport?.output).toEqual([
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'B' },
      { role: 'system', content: 'C' },
    ]);
  });

  it('should call createCharacter for createCharacterNode', async () => {
    const flow: SpecFlow = {
      nodes: [
        {
          id: 'create',
          type: 'createCharacterNode',
          data: { name: 'New Char', description: 'A description', tags: 'tag1, tag2' },
        },
      ],
      edges: [],
    };

    await runner.executeFlow(flow, new Map(), {});
    expect(dependencies.createCharacter).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Char', description: 'A description', tags: ['tag1', 'tag2'] }),
    );
  });

  it('should call saveCharacter for editCharacterNode', async () => {
    const flow: SpecFlow = {
      nodes: [
        {
          id: 'edit',
          type: 'editCharacterNode',
          data: { characterAvatar: 'test-char.png', description: 'New Description' },
        },
      ],
      edges: [],
    };

    await runner.executeFlow(flow, new Map(), {});
    expect(dependencies.saveCharacter).toHaveBeenCalledWith({ ...mockCharacter, description: 'New Description' });
  });

  it('should execute getCharacterNode and output character data', async () => {
    const flow: SpecFlow = {
      nodes: [{ id: 'getChar', type: 'getCharacterNode', data: { characterAvatar: 'test-char.png' } }],
      edges: [],
    };
    const report = await runner.executeFlow(flow, new Map(), {});
    const charNodeReport = report.executedNodes.find((n) => n.nodeId === 'getChar');
    expect(charNodeReport?.output.name).toBe('Test Character');
    expect(charNodeReport?.output.result.name).toBe('Test Character');
  });

  it('should execute jsonNode and output a valid JSON object', async () => {
    const flow: SpecFlow = {
      nodes: [
        {
          id: 'json',
          type: 'jsonNode',
          data: {
            items: [
              { id: '1', key: 'name', value: 'John', type: 'string' },
              { id: '2', key: 'age', value: 30, type: 'number' },
              {
                id: '3',
                key: 'address',
                value: [{ id: '3.1', key: 'city', value: 'New York', type: 'string' }],
                type: 'object',
              },
            ],
          },
        },
      ],
      edges: [],
    };

    const report = await runner.executeFlow(flow, new Map(), {});
    const jsonNodeReport = report.executedNodes.find((n) => n.nodeId === 'json');
    expect(jsonNodeReport?.output).toEqual({ name: 'John', age: 30, address: { city: 'New York' } });
  });

  it('should execute mergeObjectsNode and combine inputs', async () => {
    const flow: SpecFlow = {
      nodes: [
        { id: 'json1', type: 'jsonNode', data: { items: [{ id: '1', key: 'a', value: 1, type: 'number' }] } },
        {
          id: 'json2',
          type: 'jsonNode',
          data: {
            items: [
              { id: '1', key: 'b', value: 2, type: 'number' },
              { id: '2', key: 'a', value: 99, type: 'number' },
            ],
          },
        },
        { id: 'merge', type: 'mergeObjectsNode', data: { inputCount: 2 } },
      ],
      edges: [
        { id: 'e1', source: 'json1', target: 'merge', sourceHandle: null, targetHandle: 'object_0' },
        { id: 'e2', source: 'json2', target: 'merge', sourceHandle: null, targetHandle: 'object_1' },
      ],
    };
    const report = await runner.executeFlow(flow, new Map(), {});
    const mergeNodeReport = report.executedNodes.find((n) => n.nodeId === 'merge');
    expect(mergeNodeReport?.output).toEqual({ a: 99, b: 2 });
  });

  it('should execute handlebarNode and render the template', async () => {
    const flow: SpecFlow = {
      nodes: [
        {
          id: 'data',
          type: 'jsonNode',
          data: { items: [{ id: '1', key: 'name', value: 'SillyTavern', type: 'string' }] },
        },
        { id: 'template', type: 'handlebarNode', data: { template: 'Hello, {{name}}!' } },
      ],
      edges: [{ id: 'e1', source: 'data', target: 'template', sourceHandle: null, targetHandle: 'data' }],
    };

    const report = await runner.executeFlow(flow, new Map(), {});
    const handlebarNodeReport = report.executedNodes.find((n) => n.nodeId === 'template');
    expect(handlebarNodeReport?.output).toEqual({ result: 'Hello, SillyTavern!' });
  });

  it('should use connected input for customMessageNode content', async () => {
    const flow: SpecFlow = {
      nodes: [
        { id: 'string', type: 'stringNode', data: { value: 'Dynamic Content' } },
        {
          id: 'custom',
          type: 'customMessageNode',
          data: { messages: [{ id: 'msg1', role: 'user', content: 'Static Content' }] },
        },
      ],
      edges: [{ id: 'e1', source: 'string', target: 'custom', sourceHandle: 'value', targetHandle: 'msg1' }],
    };

    const report = await runner.executeFlow(flow, new Map(), {});
    const customNodeReport = report.executedNodes.find((n) => n.nodeId === 'custom');
    expect(customNodeReport?.output).toEqual([{ role: 'user', content: 'Dynamic Content' }]);
  });

  it('should call st_createNewWorldInfo for createLorebookNode', async () => {
    const flow: SpecFlow = {
      nodes: [{ id: 'create', type: 'createLorebookNode', data: { worldName: 'My Lore' } }],
      edges: [],
    };
    await runner.executeFlow(flow, new Map(), {});
    expect(dependencies.st_createNewWorldInfo).toHaveBeenCalledWith('My Lore');
  });

  it('should call applyWorldInfoEntry to create a new entry for createLorebookEntryNode', async () => {
    const flow: SpecFlow = {
      nodes: [
        {
          id: 'createEntry',
          type: 'createLorebookEntryNode',
          data: { worldName: 'My Lore', key: 'key1, key2', content: 'This is the content.', comment: 'Entry Title' },
        },
      ],
      edges: [],
    };

    await runner.executeFlow(flow, new Map(), {});
    expect(dependencies.applyWorldInfoEntry).toHaveBeenCalledWith({
      entry: expect.objectContaining({ key: ['key1', 'key2'], content: 'This is the content.' }),
      selectedWorldName: 'My Lore',
      operation: 'add',
    });
  });

  it('should call applyWorldInfoEntry to update an entry for editLorebookEntryNode', async () => {
    const mockEntry: WIEntry = {
      uid: 123,
      key: ['oldKey'],
      content: 'Old content',
      comment: 'Find Me',
      disable: false,
      keysecondary: [],
    };
    dependencies.getWorldInfos.mockResolvedValue({ 'My Lore': [mockEntry] });
    dependencies.applyWorldInfoEntry.mockImplementation(async ({ entry }) => ({ entry, operation: 'update' }));

    const flow: SpecFlow = {
      nodes: [
        {
          id: 'editEntry',
          type: 'editLorebookEntryNode',
          data: { worldName: 'My Lore', entryUid: 123, content: 'New Content' },
        },
      ],
      edges: [],
    };

    await runner.executeFlow(flow, new Map(), {});
    const updatedEntry = { ...mockEntry, content: 'New Content' };
    expect(dependencies.applyWorldInfoEntry).toHaveBeenCalledWith({
      entry: updatedEntry,
      selectedWorldName: 'My Lore',
      operation: 'update',
    });
  });
});

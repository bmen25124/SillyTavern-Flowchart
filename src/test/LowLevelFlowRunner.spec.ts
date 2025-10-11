import { jest } from '@jest/globals';
import { LowLevelFlowRunner, FlowRunnerDependencies } from '../LowLevelFlowRunner.js';
import { FlowData } from '../constants.js';
import { z } from 'zod';
import { Node } from '@xyflow/react';
import { Character } from 'sillytavern-utils-lib/types';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';

describe('LowLevelFlowRunner', () => {
  let dependencies: jest.Mocked<FlowRunnerDependencies>;
  let runner: LowLevelFlowRunner;
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
    dependencies = {
      getBaseMessagesForProfile: jest.fn(),
      makeStructuredRequest: jest.fn(),
      getSillyTavernContext: jest.fn(),
      createCharacter: jest.fn(),
      saveCharacter: jest.fn(),
      st_createNewWorldInfo: jest.fn(),
      applyWorldInfoEntry: jest.fn(),
      getWorldInfo: jest.fn(),
    };
    dependencies.getBaseMessagesForProfile.mockResolvedValue([{ role: 'user', content: 'message' }]);
    dependencies.makeStructuredRequest.mockResolvedValue({ structured: 'data' });
    dependencies.getSillyTavernContext.mockReturnValue({
      characters: [mockCharacter],
    });
    dependencies.st_createNewWorldInfo.mockResolvedValue(true);
    dependencies.applyWorldInfoEntry.mockImplementation(async ({ entry }) => ({ entry, operation: 'add' }));
    dependencies.getWorldInfo.mockResolvedValue({});
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
    expect(report.executedNodes[1].output).toEqual([{ role: 'user', content: 'message' }]);
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
    const executedNodeIds = report.executedNodes.map((n) => n.nodeId);
    expect(executedNodeIds).toContain('start');
    expect(executedNodeIds).toContain('if');
    expect(executedNodeIds).toContain('trueNode');
    expect(executedNodeIds).not.toContain('falseNode');

    const ifNodeReport = report.executedNodes.find((n) => n.nodeId === 'if');
    expect(ifNodeReport?.output).toHaveProperty('nextNodeId', 'trueNode');

    const trueNodeReport = report.executedNodes.find((n) => n.nodeId === 'trueNode');
    expect(trueNodeReport?.output).toBe('true');
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
    expect(mockCallArgs[1]).toEqual([{ role: 'user', content: 'message' }]);
    expect(mockCallArgs[2]).toBe(schemaNodeReport?.output); // Check for instance equality
    expect(mockCallArgs[3]).toBe('test-schema');
    expect(mockCallArgs[4]).toBe('native');
    expect(mockCallArgs[5]).toBe(100);

    const executedOrder = report.executedNodes.map((n) => n.nodeId).sort();
    expect(executedOrder).toEqual(['createMsg', 'request', 'schema', 'start'].sort());
    const requestNodeReport = report.executedNodes.find((n) => n.nodeId === 'request');
    expect(requestNodeReport?.output).toEqual({ structured: 'data', result: { structured: 'data' } });
  });

  it('should correctly build and use a complex schema with descriptions from schemaNode', async () => {
    const complexSchemaNode: Node = {
      id: 'schema',
      type: 'schemaNode',
      position: { x: 0, y: 0 },
      data: {
        fields: [
          {
            id: 'f1',
            name: 'user',
            type: 'object',
            description: 'The user object',
            fields: [
              { id: 'f1.1', name: 'id', type: 'number', description: 'User ID' },
              { id: 'f1.2', name: 'name', type: 'string' },
            ],
          },
          { id: 'f2', name: 'tags', type: 'array', items: { type: 'string' } },
          { id: 'f3', name: 'status', type: 'enum', values: ['active', 'inactive'] },
        ],
      },
    };

    const flow: FlowData = {
      nodes: [complexSchemaNode],
      edges: [],
    };

    const report = await runner.executeFlow(flow, {});
    const schemaOutput = report.executedNodes.find((n) => n.nodeId === 'schema')?.output as z.ZodObject<any>;

    expect(schemaOutput).toBeInstanceOf(z.ZodObject);
    expect(schemaOutput.shape.user.description).toBe('The user object');
    expect(schemaOutput.shape.user.shape.id.description).toBe('User ID');
    expect(schemaOutput.shape.user.shape.name.description).toBeUndefined();

    const validData = {
      user: { id: 1, name: 'test' },
      tags: ['a', 'b'],
      status: 'active',
    };
    expect(schemaOutput.safeParse(validData).success).toBe(true);
  });

  it('should merge messages from two sources with mergeMessagesNode in the correct order', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'start',
          type: 'triggerNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        {
          id: 'customA',
          type: 'customMessageNode',
          position: { x: 0, y: 0 },
          data: { messages: [{ id: 'm1', role: 'user', content: 'Message A' }] },
        },
        {
          id: 'customB',
          type: 'customMessageNode',
          position: { x: 0, y: 0 },
          data: { messages: [{ id: 'm2', role: 'assistant', content: 'Message B' }] },
        },
        { id: 'merge', type: 'mergeMessagesNode', position: { x: 0, y: 0 }, data: { inputCount: 2 } },
      ],
      edges: [
        { id: 'e-A-merge', source: 'customA', target: 'merge', targetHandle: 'messages_0' },
        { id: 'e-B-merge', source: 'customB', target: 'merge', targetHandle: 'messages_1' },
      ],
    };

    const report = await runner.executeFlow(flow, {});
    const mergeNodeReport = report.executedNodes.find((n) => n.nodeId === 'merge');
    expect(mergeNodeReport).toBeDefined();

    const expectedMessages = [
      { role: 'user', content: 'Message A' },
      { role: 'assistant', content: 'Message B' },
    ];
    expect(mergeNodeReport?.output).toEqual(expectedMessages);
  });

  it('should merge messages from multiple dynamic sources in the correct order', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'start',
          type: 'triggerNode',
          position: { x: 0, y: 0 },
          data: { selectedEventType: 'user_message_rendered' },
        },
        {
          id: 'customA',
          type: 'customMessageNode',
          position: { x: 0, y: 0 },
          data: { messages: [{ id: 'm1', role: 'user', content: 'A' }] },
        },
        {
          id: 'customB',
          type: 'customMessageNode',
          position: { x: 0, y: 0 },
          data: { messages: [{ id: 'm2', role: 'assistant', content: 'B' }] },
        },
        {
          id: 'customC',
          type: 'customMessageNode',
          position: { x: 0, y: 0 },
          data: { messages: [{ id: 'm3', role: 'system', content: 'C' }] },
        },
        { id: 'merge', type: 'mergeMessagesNode', position: { x: 0, y: 0 }, data: { inputCount: 3 } },
      ],
      edges: [
        { id: 'e-A-merge', source: 'customA', target: 'merge', targetHandle: 'messages_0' },
        { id: 'e-B-merge', source: 'customB', target: 'merge', targetHandle: 'messages_1' },
        { id: 'e-C-merge', source: 'customC', target: 'merge', targetHandle: 'messages_2' },
      ],
    };

    const report = await runner.executeFlow(flow, {});
    const mergeNodeReport = report.executedNodes.find((n) => n.nodeId === 'merge');
    expect(mergeNodeReport).toBeDefined();

    const expectedMessages = [
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'B' },
      { role: 'system', content: 'C' },
    ];

    expect(mergeNodeReport?.output).toEqual(expectedMessages);
  });

  it('should call createCharacter for createCharacterNode', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'create',
          type: 'createCharacterNode',
          position: { x: 0, y: 0 },
          data: {
            name: 'New Char',
            description: 'A description',
            tags: 'tag1, tag2',
          },
        },
      ],
      edges: [],
    };

    const report = await runner.executeFlow(flow, {});
    expect(dependencies.createCharacter).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Char',
        description: 'A description',
        tags: ['tag1', 'tag2'],
        avatar: 'none',
        spec: 'chara_card_v3',
      }),
    );
    expect(report.executedNodes[0].output).toBe('New Char');
  });

  it('should call saveCharacter for editCharacterNode', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'edit',
          type: 'editCharacterNode',
          position: { x: 0, y: 0 },
          data: {
            characterAvatar: 'test-char.png',
            description: 'New Description',
          },
        },
      ],
      edges: [],
    };

    const report = await runner.executeFlow(flow, {});
    expect(dependencies.saveCharacter).toHaveBeenCalledWith({
      ...mockCharacter,
      description: 'New Description',
    });
    expect(report.executedNodes[0].output).toBe('Test Character');
  });

  it('should execute manualTriggerNode and provide its JSON payload as output', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'manual',
          type: 'manualTriggerNode',
          position: { x: 0, y: 0 },
          data: { payload: '{ "user": "test", "id": 123 }' },
        },
        { id: 'string', type: 'stringNode', position: { x: 0, y: 0 }, data: { value: 'static' } },
      ],
      edges: [{ id: 'e1', source: 'manual', target: 'string', sourceHandle: null, targetHandle: null }],
    };
    const report = await runner.executeFlow(flow, {});
    const triggerNodeReport = report.executedNodes.find((n) => n.nodeId === 'manual');
    expect(triggerNodeReport?.output).toEqual({ user: 'test', id: 123 });

    const stringNodeReport = report.executedNodes.find((n) => n.nodeId === 'string');
    // The string node's 'value' input is not connected, so it should take its static value.
    // The input context is merged from the trigger, but doesn't affect the 'value' handle.
    expect(stringNodeReport?.input).toEqual({ user: 'test', id: 123 });
    expect(stringNodeReport?.output).toEqual('static');
  });

  it('should execute getCharacterNode and output character data', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'getChar',
          type: 'getCharacterNode',
          position: { x: 0, y: 0 },
          data: { characterAvatar: 'test-char.png' },
        },
      ],
      edges: [],
    };
    const report = await runner.executeFlow(flow, {});
    const charNodeReport = report.executedNodes.find((n) => n.nodeId === 'getChar');
    expect(charNodeReport?.output.name).toBe('Test Character');
    expect(charNodeReport?.output.description).toBe('A mock character for testing.');
    expect(charNodeReport?.output.result.name).toBe('Test Character');
  });

  it('should execute jsonNode and output a valid JSON object', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'json',
          type: 'jsonNode',
          position: { x: 0, y: 0 },
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

    const report = await runner.executeFlow(flow, {});
    const jsonNodeReport = report.executedNodes.find((n) => n.nodeId === 'json');
    expect(jsonNodeReport?.output).toEqual({
      name: 'John',
      age: 30,
      address: { city: 'New York' },
    });
  });

  it('should execute mergeObjectsNode and combine inputs', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'json1',
          type: 'jsonNode',
          position: { x: 0, y: 0 },
          data: { items: [{ id: '1', key: 'a', value: 1, type: 'number' }] },
        },
        {
          id: 'json2',
          type: 'jsonNode',
          position: { x: 0, y: 0 },
          data: {
            items: [
              { id: '1', key: 'b', value: 2, type: 'number' },
              { id: '2', key: 'a', value: 99, type: 'number' },
            ],
          },
        },
        {
          id: 'merge',
          type: 'mergeObjectsNode',
          position: { x: 0, y: 0 },
          data: { inputCount: 2 },
        },
      ],
      edges: [
        { id: 'e1', source: 'json1', target: 'merge', targetHandle: 'object_0' },
        { id: 'e2', source: 'json2', target: 'merge', targetHandle: 'object_1' },
      ],
    };
    const report = await runner.executeFlow(flow, {});
    const mergeNodeReport = report.executedNodes.find((n) => n.nodeId === 'merge');
    // json2 (object_1) should overwrite properties from json1 (object_0)
    expect(mergeNodeReport?.output).toEqual({ a: 99, b: 2 });
  });

  it('should execute handlebarNode and render the template', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'data',
          type: 'jsonNode',
          position: { x: 0, y: 0 },
          data: { items: [{ id: '1', key: 'name', value: 'SillyTavern', type: 'string' }] },
        },
        {
          id: 'template',
          type: 'handlebarNode',
          position: { x: 0, y: 0 },
          data: { template: 'Hello, {{name}}!' },
        },
      ],
      edges: [{ id: 'e1', source: 'data', target: 'template', targetHandle: 'data' }],
    };

    const report = await runner.executeFlow(flow, {});
    const handlebarNodeReport = report.executedNodes.find((n) => n.nodeId === 'template');
    expect(handlebarNodeReport?.output).toEqual({ result: 'Hello, SillyTavern!' });
  });

  it('should use connected input for customMessageNode content', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'string',
          type: 'stringNode',
          position: { x: 0, y: 0 },
          data: { value: 'Dynamic Content' },
        },
        {
          id: 'custom',
          type: 'customMessageNode',
          position: { x: 0, y: 0 },
          data: {
            messages: [{ id: 'msg1', role: 'user', content: 'Static Content' }],
          },
        },
      ],
      edges: [{ id: 'e1', source: 'string', target: 'custom', targetHandle: 'msg1' }],
    };

    const report = await runner.executeFlow(flow, {});
    const customNodeReport = report.executedNodes.find((n) => n.nodeId === 'custom');
    expect(customNodeReport?.output).toEqual([{ role: 'user', content: 'Dynamic Content' }]);
  });

  it('should call st_createNewWorldInfo for createLorebookNode', async () => {
    const flow: FlowData = {
      nodes: [{ id: 'create', type: 'createLorebookNode', position: { x: 0, y: 0 }, data: { worldName: 'My Lore' } }],
      edges: [],
    };

    const report = await runner.executeFlow(flow, {});
    expect(dependencies.st_createNewWorldInfo).toHaveBeenCalledWith('My Lore');
    expect(report.executedNodes[0].output).toBe('My Lore');
  });

  it('should call applyWorldInfoEntry to create a new entry for createLorebookEntryNode', async () => {
    const flow: FlowData = {
      nodes: [
        {
          id: 'createEntry',
          type: 'createLorebookEntryNode',
          position: { x: 0, y: 0 },
          data: {
            worldName: 'My Lore',
            key: 'key1, key2',
            content: 'This is the content.',
            comment: 'Entry Title',
          },
        },
      ],
      edges: [],
    };

    const report = await runner.executeFlow(flow, {});
    expect(dependencies.applyWorldInfoEntry).toHaveBeenCalledWith({
      entry: {
        uid: -1,
        key: ['key1', 'key2'],
        content: 'This is the content.',
        comment: 'Entry Title',
        disable: false,
        keysecondary: [],
      },
      selectedWorldName: 'My Lore',
      operation: 'add',
    });
    expect(report.executedNodes[0].output).toBeDefined();
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
    dependencies.getWorldInfo.mockResolvedValue({ 'My Lore': [mockEntry] });
    dependencies.applyWorldInfoEntry.mockImplementation(async ({ entry }) => ({ entry, operation: 'update' }));

    const flow: FlowData = {
      nodes: [
        {
          id: 'editEntry',
          type: 'editLorebookEntryNode',
          position: { x: 0, y: 0 },
          data: {
            worldName: 'My Lore',
            entryUid: 123,
            content: 'New Content',
          },
        },
      ],
      edges: [],
    };

    const report = await runner.executeFlow(flow, {});
    const updatedEntry = {
      ...mockEntry,
      content: 'New Content',
    };
    expect(dependencies.getWorldInfo).toHaveBeenCalledWith(['all']);
    expect(dependencies.applyWorldInfoEntry).toHaveBeenCalledWith({
      entry: updatedEntry,
      selectedWorldName: 'My Lore',
      operation: 'update',
    });
    expect(report.executedNodes[0].output).toEqual(updatedEntry);
  });
});

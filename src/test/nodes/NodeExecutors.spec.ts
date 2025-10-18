import { jest } from '@jest/globals';
import { createMockContext, createMockNode, mockDependencies } from './mockNodeExecutor.js';
import { FlowRunnerDependencies, NodeExecutorContext } from '../../NodeExecutor.js';
import { z } from 'zod';
import { generateUUID } from '../../utils/uuid.js';

import { stringNodeDefinition } from '../../components/nodes/StringNode/definition.js';
import { numberNodeDefinition } from '../../components/nodes/NumberNode/definition.js';
import { mathNodeDefinition } from '../../components/nodes/MathNode/definition.js';
import { setVariableNodeDefinition } from '../../components/nodes/SetVariableNode/definition.js';
import { getVariableNodeDefinition } from '../../components/nodes/GetVariableNode/definition.js';
import { ifNodeDefinition } from '../../components/nodes/IfNode/definition.js';
import { executeJsNodeDefinition } from '../../components/nodes/ExecuteJsNode/definition.js';
import { createLorebookNodeDefinition } from '../../components/nodes/CreateLorebookNode/definition.js';
import { getPropertyNodeDefinition } from '../../components/nodes/GetPropertyNode/definition.js';
import { randomNodeDefinition } from '../../components/nodes/RandomNode/definition.js';
import { regexNodeDefinition } from '../../components/nodes/RegexNode/definition.js';
import { runSlashCommandNodeDefinition } from '../../components/nodes/RunSlashCommandNode/definition.js';
import { llmRequestNodeDefinition } from '../../components/nodes/LLMRequestNode/definition.js';
import { PromptEngineeringMode } from '../../config.js';
import { jsonNodeDefinition } from '../../components/nodes/JsonNode/definition.js';
import { schemaNodeDefinition } from '../../components/nodes/SchemaNode/definition.js';
import { mergeMessagesNodeDefinition } from '../../components/nodes/MergeMessagesNode/definition.js';
import { mergeObjectsNodeDefinition } from '../../components/nodes/MergeObjectsNode/definition.js';
import { handlebarNodeDefinition } from '../../components/nodes/HandlebarNode/definition.js';
import { stringToolsNodeDefinition } from '../../components/nodes/StringToolsNode/definition.js';
import { slashCommandNodeDefinition } from '../../components/nodes/SlashCommandNode/definition.js';
import { triggerNodeDefinition } from '../../components/nodes/TriggerNode/definition.js';
import { typeConverterNodeDefinition } from '../../components/nodes/TypeConverterNode/definition.js';
import { dateTimeNodeDefinition } from '../../components/nodes/DateTimeNode/definition.js';

describe('Node Executors', () => {
  let dependencies: jest.Mocked<FlowRunnerDependencies>;
  let context: NodeExecutorContext;

  beforeEach(() => {
    dependencies = mockDependencies();
    context = createMockContext({}, dependencies);
  });

  // --- Input Nodes ---
  describe('StringNode', () => {
    const { execute } = stringNodeDefinition;

    it('should return the static value when no input is connected', async () => {
      const node = createMockNode(stringNodeDefinition, { value: 'static text' });
      const result = await execute(node, {}, context);
      expect(result).toEqual({ value: 'static text' });
    });

    it('should return the connected input value, converting it to a string', async () => {
      const node = createMockNode(stringNodeDefinition, { value: 'static text' });
      const result = await execute(node, { value: 123 }, context);
      expect(result).toEqual({ value: '123' });
    });
  });

  describe('NumberNode', () => {
    const { execute } = numberNodeDefinition;

    it('should return the static value', async () => {
      const node = createMockNode(numberNodeDefinition, { value: 42 });
      const result = await execute(node, {}, context);
      expect(result).toEqual({ value: 42 });
    });

    it('should prioritize and convert the connected input value', async () => {
      const node = createMockNode(numberNodeDefinition, { value: 99 });
      const result = await execute(node, { value: '123.45' }, context);
      expect(result).toEqual({ value: 123.45 });
    });
  });

  // --- Utility Nodes ---
  describe('MathNode', () => {
    const { execute } = mathNodeDefinition;

    it('should add two numbers from static data', async () => {
      const node = createMockNode(mathNodeDefinition, { operation: 'add', a: 5, b: 3 });
      const result = await execute(node, {}, context);
      expect(result).toEqual({ result: 8 });
    });

    it('should subtract two numbers from connected inputs', async () => {
      const node = createMockNode(mathNodeDefinition, { operation: 'subtract' });
      const result = await execute(node, { a: 10, b: 4 }, context);
      expect(result).toEqual({ result: 6 });
    });

    it('should throw an error on division by zero', async () => {
      const node = createMockNode(mathNodeDefinition, { operation: 'divide', a: 10, b: 0 });
      await expect(execute(node, {}, context)).rejects.toThrow('Division by zero.');
    });
  });

  describe('GetPropertyNode', () => {
    const { execute } = getPropertyNodeDefinition;

    it('should get a top-level property', async () => {
      const node = createMockNode(getPropertyNodeDefinition, { path: 'name' });
      const result = await execute(node, { object: { name: 'Alice', age: 30 } }, context);
      expect(result).toEqual({ value: 'Alice' });
    });

    it('should get a nested property', async () => {
      const node = createMockNode(getPropertyNodeDefinition, { path: 'address.city' });
      const obj = { name: 'Alice', address: { city: 'Wonderland' } };
      const result = await execute(node, { object: obj }, context);
      expect(result).toEqual({ value: 'Wonderland' });
    });

    it('should get a property from an array using bracket notation', async () => {
      const node = createMockNode(getPropertyNodeDefinition, { path: 'items[1]' });
      const obj = { items: ['a', 'b', 'c'] };
      const result = await execute(node, { object: obj }, context);
      expect(result).toEqual({ value: 'b' });
    });

    it('should get a nested property from an object within an array', async () => {
      const node = createMockNode(getPropertyNodeDefinition, { path: 'users[0].name' });
      const obj = { users: [{ name: 'Bob' }, { name: 'Charlie' }] };
      const result = await execute(node, { object: obj }, context);
      expect(result).toEqual({ value: 'Bob' });
    });

    it('should return undefined for a non-existent path', async () => {
      const node = createMockNode(getPropertyNodeDefinition, { path: 'address.zip' });
      const obj = { name: 'Alice', address: { city: 'Wonderland' } };
      const result = await execute(node, { object: obj }, context);
      expect(result).toEqual({ value: undefined });
    });

    it('should throw an error if input is not an object', async () => {
      const node = createMockNode(getPropertyNodeDefinition, { path: 'some.path' });
      await expect(execute(node, { object: 'not-an-object' }, context)).rejects.toThrow(
        'Input is not a valid object in getPropertyNode.',
      );
    });
  });

  describe('RandomNode', () => {
    const { execute } = randomNodeDefinition;

    it('should generate a random number within range', async () => {
      const node = createMockNode(randomNodeDefinition, { mode: 'number', min: 10, max: 20 });
      const { result } = await execute(node, {}, context);
      expect(result).toBeGreaterThanOrEqual(10);
      expect(result).toBeLessThanOrEqual(20);
    });

    it('should pick a random element from an array', async () => {
      const node = createMockNode(randomNodeDefinition, { mode: 'array' });
      const inputArray = ['a', 'b', 'c'];
      const { result } = await execute(node, { array: inputArray }, context);
      expect(inputArray).toContain(result);
    });

    it('should throw if array is empty or not provided for array mode', async () => {
      const node = createMockNode(randomNodeDefinition, { mode: 'array' });
      await expect(execute(node, { array: [] }, context)).rejects.toThrow('Input is not a non-empty array.');
      await expect(execute(node, {}, context)).rejects.toThrow('Input is not a non-empty array.');
    });
  });

  // --- Context-Aware Nodes ---
  describe('SetVariableNode & GetVariableNode', () => {
    const { execute: setExecute } = setVariableNodeDefinition;
    const { execute: getExecute } = getVariableNodeDefinition;

    it('should set a variable in the execution context and then retrieve it', async () => {
      // Set the variable
      const setNode = createMockNode(setVariableNodeDefinition, { variableName: 'myVar' });
      const setValue = { data: 'test-data' };
      await setExecute(setNode, { value: setValue }, context);

      // Verify side effect (context modification)
      expect(context.executionVariables.get('myVar')).toBe(setValue);

      // Get the variable
      const getNode = createMockNode(getVariableNodeDefinition, { variableName: 'myVar' });
      const getResult = await getExecute(getNode, {}, context);

      // Verify retrieval
      expect(getResult).toEqual({ value: setValue });
    });

    it('GetVariableNode should throw if variable does not exist', async () => {
      const getNode = createMockNode(getVariableNodeDefinition, { variableName: 'nonExistentVar' });
      await expect(getExecute(getNode, {}, context)).rejects.toThrow('Execution variable "nonExistentVar" not found.');
    });
  });

  // --- Logic Nodes ---
  describe('IfNode', () => {
    const { execute } = ifNodeDefinition;

    it('should return the condition ID for the first true simple condition', async () => {
      const trueConditionId = generateUUID();
      const node = createMockNode(ifNodeDefinition, {
        conditions: [
          { id: 'false-cond', mode: 'simple', operator: 'equals', value: 'wrong', code: '', inputProperty: '' },
          { id: trueConditionId, mode: 'simple', operator: 'equals', value: 'correct', code: '', inputProperty: '' },
        ],
      });
      const result = await execute(node, { value: 'correct' }, context);
      expect(result).toEqual({ activatedHandle: trueConditionId });
    });

    it('should return "false" if no conditions are met', async () => {
      const node = createMockNode(ifNodeDefinition, {
        conditions: [
          { id: 'some-cond', mode: 'simple', operator: 'equals', value: 'nope', code: '', inputProperty: '' },
        ],
      });
      const result = await execute(node, { value: 'a different value' }, context);
      expect(result).toEqual({ activatedHandle: 'false' });
    });

    it('should execute advanced code and return the ID on truthy result', async () => {
      const trueConditionId = generateUUID();
      const node = createMockNode(ifNodeDefinition, {
        conditions: [
          {
            id: trueConditionId,
            mode: 'advanced',
            code: 'return input > 10;',
            inputProperty: '',
            operator: 'equals',
            value: '',
          },
        ],
      });
      const result = await execute(node, { value: 20 }, context);
      expect(result).toEqual({ activatedHandle: trueConditionId });
    });
  });

  // --- Complex Logic & Dynamic Handles ---
  describe('JsonNode', () => {
    const { execute } = jsonNodeDefinition;
    it('should build a nested JSON object from its data', async () => {
      const node = createMockNode(jsonNodeDefinition, {
        rootType: 'object',
        items: [
          { id: '1', key: 'name', type: 'string', value: 'Alice' },
          { id: '2', key: 'age', type: 'number', value: 30 },
          {
            id: '3',
            key: 'address',
            type: 'object',
            value: [{ id: '4', key: 'city', type: 'string', value: 'Wonderland' }],
          },
        ],
      });
      const result = await execute(node, {}, context);
      const expectedObject = { name: 'Alice', age: 30, address: { city: 'Wonderland' } };
      expect(result).toEqual({ ...expectedObject, result: expectedObject });
    });
  });

  describe('SchemaNode', () => {
    const { execute } = schemaNodeDefinition;
    it('should generate a valid Zod schema', async () => {
      const node = createMockNode(schemaNodeDefinition, {
        fields: [{ id: 'f1', name: 'username', type: 'string', description: 'User name' }],
      });
      const result = await execute(node, {}, context);
      expect(result.result).toBeInstanceOf(z.ZodObject);
      const validation = result.result.safeParse({ username: 'test' });
      expect(validation.success).toBe(true);
    });
  });

  describe('MergeMessagesNode', () => {
    const { execute } = mergeMessagesNodeDefinition;
    it('should merge message arrays in order', async () => {
      const node = createMockNode(mergeMessagesNodeDefinition, { inputCount: 2 });
      const input = {
        messages_0: [{ role: 'user', content: 'A' }],
        messages_1: [{ role: 'assistant', content: 'B' }],
      };
      const result = await execute(node, input, context);
      expect(result).toEqual({
        result: [
          { role: 'user', content: 'A' },
          { role: 'assistant', content: 'B' },
        ],
      });
    });
  });

  describe('MergeObjectsNode', () => {
    const { execute } = mergeObjectsNodeDefinition;
    it('should merge objects, with later inputs overwriting earlier ones', async () => {
      const node = createMockNode(mergeObjectsNodeDefinition, { inputCount: 2 });
      const input = { object_0: { a: 1, b: 2 }, object_1: { b: 3, c: 4 } };
      const result = await execute(node, input, context);
      expect(result).toEqual({ result: { a: 1, b: 3, c: 4 } });
    });
  });

  describe('HandlebarNode', () => {
    const { execute } = handlebarNodeDefinition;
    it('should render a template with the provided data context', async () => {
      const node = createMockNode(handlebarNodeDefinition, { template: 'Hello, {{name}}!' });
      const result = await execute(node, { context: { name: 'World' } }, context);
      expect(result).toEqual({ result: 'Hello, World!' });
    });
  });

  describe('StringToolsNode', () => {
    const { execute } = stringToolsNodeDefinition;
    it('should merge multiple strings with a delimiter', async () => {
      const node = createMockNode(stringToolsNodeDefinition, { operation: 'merge', delimiter: ',', inputCount: 2 });
      const result = await execute(node, { string_0: 'a', string_1: 'b' }, context);
      expect(result).toEqual({ result: 'a,b' });
    });
    it('should split a string into an array', async () => {
      const node = createMockNode(stringToolsNodeDefinition, { operation: 'split', delimiter: ',' });
      const result = await execute(node, { string: 'a,b,c' }, context);
      expect(result).toEqual({ result: ['a', 'b', 'c'] });
    });
  });

  // --- Trigger Nodes (simple pass-through execution) ---
  describe('TriggerNode & SlashCommandNode', () => {
    it('TriggerNode should pass through its input', async () => {
      const { execute } = triggerNodeDefinition;
      const node = createMockNode(triggerNodeDefinition, { selectedEventType: 'user_message_rendered' });
      const input = { messageId: 123 };
      const result = await execute(node, input, context);
      expect(result).toEqual(input);
    });

    it('SlashCommandNode should pass through its input', async () => {
      const { execute } = slashCommandNodeDefinition;
      const node = createMockNode(slashCommandNodeDefinition, { commandName: 'test' });
      const input = { arg1: 'value', unnamed: 'text' };
      const result = await execute(node, input, context);
      expect(result).toEqual({ ...input, allArgs: input });
    });
  });

  // --- Simple & Untested Utilities ---
  describe('TypeConverterNode', () => {
    const { execute } = typeConverterNodeDefinition;
    it('should convert an object to a JSON string', async () => {
      const node = createMockNode(typeConverterNodeDefinition, { targetType: 'string' });
      const result = await execute(node, { value: { a: 1 } }, context);
      expect(result).toEqual({ result: '{\n  "a": 1\n}' });
    });
    it('should convert a JSON string to an object', async () => {
      const node = createMockNode(typeConverterNodeDefinition, { targetType: 'object' });
      const result = await execute(node, { value: '{"a": 1}' }, context);
      expect(result).toEqual({ result: { a: 1 } });
    });
    it('should convert a valid string to a number', async () => {
      const node = createMockNode(typeConverterNodeDefinition, { targetType: 'number' });
      const result = await execute(node, { value: '123.45' }, context);
      expect(result).toEqual({ result: 123.45 });
    });
    it('should throw an error for an invalid number conversion', async () => {
      const node = createMockNode(typeConverterNodeDefinition, { targetType: 'number' });
      await expect(execute(node, { value: 'abc' }, context)).rejects.toThrow(
        "Type conversion failed: 'abc' cannot be converted to a number.",
      );
    });
  });

  describe('DateTimeNode', () => {
    const { execute } = dateTimeNodeDefinition;
    it('should return a valid date/time object', async () => {
      const node = createMockNode(dateTimeNodeDefinition, {});
      const result = await execute(node, {}, context);
      expect(result).toHaveProperty('iso');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.year).toBe('number');
      expect(typeof result.iso).toBe('string');
    });
  });

  // --- Dangerous & Dependency-Calling Nodes ---
  describe('ExecuteJsNode', () => {
    const { execute } = executeJsNodeDefinition;

    it('should execute code and return the result', async () => {
      const node = createMockNode(executeJsNodeDefinition, { code: 'return input.a + input.b;' });
      const result = await execute(node, { scriptInput: { a: 10, b: 5 } }, context);
      expect(result).toBe(15);
    });

    it('should have access to variables and stContext', async () => {
      context.executionVariables.set('myVar', 100);
      dependencies.getSillyTavernContext.mockReturnValue({ test: 'context' } as any);
      const node = createMockNode(executeJsNodeDefinition, {
        code: 'return variables.myVar + (stContext.test ? 1 : 0);',
      });
      const result = await execute(node, {}, context);
      expect(result).toBe(101);
    });
  });

  describe('CreateLorebookNode', () => {
    const { execute } = createLorebookNodeDefinition;

    it('should call the dependency to create a new lorebook', async () => {
      dependencies.st_createNewWorldInfo.mockResolvedValue(true);
      const node = createMockNode(createLorebookNodeDefinition, { worldName: 'My New Lorebook' });
      const result = await execute(node, {}, context);

      expect(dependencies.st_createNewWorldInfo).toHaveBeenCalledWith('My New Lorebook');
      expect(result).toEqual({ result: 'My New Lorebook' });
    });

    it('should throw if the dependency reports failure', async () => {
      dependencies.st_createNewWorldInfo.mockResolvedValue(false);
      const node = createMockNode(createLorebookNodeDefinition, { worldName: 'Existing Lorebook' });

      await expect(execute(node, {}, context)).rejects.toThrow(
        'Failed to create lorebook "Existing Lorebook". It might already exist.',
      );
    });
  });

  describe('RegexNode', () => {
    const { execute } = regexNodeDefinition;

    it('should perform a custom regex replacement', async () => {
      const node = createMockNode(regexNodeDefinition, {
        mode: 'custom',
        findRegex: 'world',
        replaceString: 'planet',
      });
      const result = await execute(node, { string: 'hello world' }, context);
      expect(result).toEqual({ result: 'hello planet', matches: ['world'] });
    });

    it('should run a SillyTavern regex script', async () => {
      const mockScript = { id: 'test-script', findRegex: 'quick', replaceString: 'slow' };
      dependencies.getSillyTavernContext.mockReturnValue({
        extensionSettings: { regex: [mockScript] },
      } as any);
      dependencies.st_runRegexScript.mockReturnValue('The slow brown fox');

      const node = createMockNode(regexNodeDefinition, { mode: 'sillytavern', scriptId: 'test-script' });
      const result = await execute(node, { string: 'The quick brown fox' }, context);

      expect(dependencies.st_runRegexScript).toHaveBeenCalledWith(mockScript, 'The quick brown fox');
      expect(result).toEqual({ result: 'The slow brown fox', matches: ['quick'] });
    });

    it('should throw if a SillyTavern script is not found', async () => {
      dependencies.getSillyTavernContext.mockReturnValue({
        extensionSettings: { regex: [] },
      } as any);
      const node = createMockNode(regexNodeDefinition, { mode: 'sillytavern', scriptId: 'non-existent' });
      await expect(execute(node, { string: 'test' }, context)).rejects.toThrow(
        'Regex with ID "non-existent" not found.',
      );
    });
  });

  describe('RunSlashCommandNode', () => {
    const { execute } = runSlashCommandNodeDefinition;

    it('should execute a slash command and return the pipe result', async () => {
      dependencies.executeSlashCommandsWithOptions.mockResolvedValue({
        isError: false,
        isAborted: false,
        pipe: 'Command output',
      });
      const node = createMockNode(runSlashCommandNodeDefinition, { command: '/echo test' });
      const result = await execute(node, {}, context);
      expect(dependencies.executeSlashCommandsWithOptions).toHaveBeenCalledWith('/echo test');
      expect(result).toEqual({ result: 'Command output' });
    });

    it('should throw if the slash command returns an error', async () => {
      dependencies.executeSlashCommandsWithOptions.mockResolvedValue({
        isError: true,
        errorMessage: 'Test error',
      });
      const node = createMockNode(runSlashCommandNodeDefinition, { command: '/fail' });
      await expect(execute(node, {}, context)).rejects.toThrow('Slash command failed: Test error');
    });
  });

  describe('LLMRequestNode', () => {
    const { execute } = llmRequestNodeDefinition;

    it('should make a simple request when no schema is provided', async () => {
      dependencies.makeSimpleRequest.mockResolvedValue('Simple response');
      const node = createMockNode(llmRequestNodeDefinition, {
        profileId: 'test-profile',
        maxResponseToken: 50,
      });
      const messages = [{ role: 'user', content: 'Hi' }];
      const result = await execute(node, { profileId: 'test-profile', messages, maxResponseToken: 50 }, context);
      expect(dependencies.makeSimpleRequest).toHaveBeenCalledWith('test-profile', messages, 50, undefined, undefined);
      expect(result).toEqual({ result: 'Simple response' });
    });

    it('should make a structured request when a schema is provided', async () => {
      const structuredResponse = { name: 'Alice', age: 30 };
      dependencies.makeStructuredRequest.mockResolvedValue(structuredResponse);
      const testSchema = z.object({ name: z.string(), age: z.number() });
      const node = createMockNode(llmRequestNodeDefinition, {
        profileId: 'test-profile',
        schemaName: 'person',
        promptEngineeringMode: PromptEngineeringMode.NATIVE,
        maxResponseToken: 100,
      });
      const messages = [{ role: 'user', content: 'Extract person' }];
      const result = await execute(
        node,
        { profileId: 'test-profile', messages, schema: testSchema, maxResponseToken: 100 },
        context,
      );

      expect(dependencies.makeStructuredRequest).toHaveBeenCalledWith(
        'test-profile',
        messages,
        testSchema,
        'person',
        'native',
        100,
        undefined,
      );
      expect(result).toEqual({
        ...structuredResponse,
        result: structuredResponse,
      });
    });
  });
});

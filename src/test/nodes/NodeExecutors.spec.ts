import { jest } from '@jest/globals';
import { createMockContext, createMockNode, mockDependencies } from './mockNodeExecutor.js';
import { FlowRunnerDependencies, NodeExecutorContext } from '../../NodeExecutor.js';

import { stringNodeDefinition } from '../../components/nodes/StringNode/definition.js';
import { numberNodeDefinition } from '../../components/nodes/NumberNode/definition.js';
import { mathNodeDefinition } from '../../components/nodes/MathNode/definition.js';
import { setVariableNodeDefinition } from '../../components/nodes/SetVariableNode/definition.js';
import { getVariableNodeDefinition } from '../../components/nodes/GetVariableNode/definition.js';
import { ifNodeDefinition } from '../../components/nodes/IfNode/definition.js';
import { executeJsNodeDefinition } from '../../components/nodes/ExecuteJsNode/definition.js';
import { createLorebookNodeDefinition } from '../../components/nodes/CreateLorebookNode/definition.js';

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
      const node = createMockNode('stringNode', { value: 'static text' });
      const result = await execute(node, {}, context);
      expect(result).toEqual({ value: 'static text' });
    });

    it('should return the connected input value, converting it to a string', async () => {
      const node = createMockNode('stringNode', { value: 'static text' });
      const result = await execute(node, { value: 123 }, context);
      expect(result).toEqual({ value: '123' });
    });
  });

  describe('NumberNode', () => {
    const { execute } = numberNodeDefinition;

    it('should return the static value', async () => {
      const node = createMockNode('numberNode', { value: 42 });
      const result = await execute(node, {}, context);
      expect(result).toEqual({ value: 42 });
    });

    it('should prioritize and convert the connected input value', async () => {
      const node = createMockNode('numberNode', { value: 99 });
      const result = await execute(node, { value: '123.45' }, context);
      expect(result).toEqual({ value: 123.45 });
    });
  });

  // --- Utility Nodes ---
  describe('MathNode', () => {
    const { execute } = mathNodeDefinition;

    it('should add two numbers from static data', async () => {
      const node = createMockNode('mathNode', { operation: 'add', a: 5, b: 3 });
      const result = await execute(node, {}, context);
      expect(result).toEqual({ result: 8 });
    });

    it('should subtract two numbers from connected inputs', async () => {
      const node = createMockNode('mathNode', { operation: 'subtract' });
      const result = await execute(node, { a: 10, b: 4 }, context);
      expect(result).toEqual({ result: 6 });
    });

    it('should throw an error on division by zero', async () => {
      const node = createMockNode('mathNode', { operation: 'divide', a: 10, b: 0 });
      await expect(execute(node, {}, context)).rejects.toThrow('Division by zero.');
    });
  });

  // --- Context-Aware Nodes ---
  describe('SetVariableNode & GetVariableNode', () => {
    const { execute: setExecute } = setVariableNodeDefinition;
    const { execute: getExecute } = getVariableNodeDefinition;

    it('should set a variable in the execution context and then retrieve it', async () => {
      // Set the variable
      const setNode = createMockNode('setVariableNode', { variableName: 'myVar' });
      const setValue = { data: 'test-data' };
      const setResult = await setExecute(setNode, { value: setValue }, context);

      // Verify passthrough and context modification
      expect(setResult).toEqual({ value: setValue });
      expect(context.executionVariables.get('myVar')).toBe(setValue);

      // Get the variable
      const getNode = createMockNode('getVariableNode', { variableName: 'myVar' });
      const getResult = await getExecute(getNode, {}, context);

      // Verify retrieval
      expect(getResult).toEqual({ value: setValue });
    });

    it('GetVariableNode should throw if variable does not exist', async () => {
      const getNode = createMockNode('getVariableNode', { variableName: 'nonExistentVar' });
      await expect(getExecute(getNode, {}, context)).rejects.toThrow('Execution variable "nonExistentVar" not found.');
    });
  });

  // --- Logic Nodes ---
  describe('IfNode', () => {
    const { execute } = ifNodeDefinition;

    it('should return the condition ID for the first true simple condition', async () => {
      const trueConditionId = crypto.randomUUID();
      const node = createMockNode('ifNode', {
        conditions: [
          { id: 'false-cond', mode: 'simple', operator: 'equals', value: 'wrong' },
          { id: trueConditionId, mode: 'simple', operator: 'equals', value: 'correct' },
        ],
      });
      const result = await execute(node, 'correct', context);
      expect(result).toEqual({ activatedHandle: trueConditionId });
    });

    it('should return "false" if no conditions are met', async () => {
      const node = createMockNode('ifNode', {
        conditions: [{ id: 'some-cond', mode: 'simple', operator: 'equals', value: 'nope' }],
      });
      const result = await execute(node, 'a different value', context);
      expect(result).toEqual({ activatedHandle: 'false' });
    });

    it('should execute advanced code and return the ID on truthy result', async () => {
      const trueConditionId = crypto.randomUUID();
      const node = createMockNode('ifNode', {
        conditions: [{ id: trueConditionId, mode: 'advanced', code: 'return input.value > 10;' }],
      });
      const result = await execute(node, { value: 20 }, context);
      expect(result).toEqual({ activatedHandle: trueConditionId });
    });
  });

  // --- Dangerous & Dependency-Calling Nodes ---
  describe('ExecuteJsNode', () => {
    const { execute } = executeJsNodeDefinition;

    it('should execute code and return the result', async () => {
      const node = createMockNode('executeJsNode', { code: 'return input.a + input.b;' });
      const result = await execute(node, { a: 10, b: 5 }, context);
      expect(result).toBe(15);
    });

    it('should have access to variables and stContext', async () => {
      context.executionVariables.set('myVar', 100);
      dependencies.getSillyTavernContext.mockReturnValue({ test: 'context' } as any);
      const node = createMockNode('executeJsNode', { code: 'return variables.myVar + (stContext.test ? 1 : 0);' });
      const result = await execute(node, {}, context);
      expect(result).toBe(101);
    });
  });

  describe('CreateLorebookNode', () => {
    const { execute } = createLorebookNodeDefinition;

    it('should call the dependency to create a new lorebook', async () => {
      dependencies.st_createNewWorldInfo.mockResolvedValue(true);
      const node = createMockNode('createLorebookNode', { worldName: 'My New Lorebook' });
      const result = await execute(node, {}, context);

      expect(dependencies.st_createNewWorldInfo).toHaveBeenCalledWith('My New Lorebook');
      expect(result).toBe('My New Lorebook');
    });

    it('should throw if the dependency reports failure', async () => {
      dependencies.st_createNewWorldInfo.mockResolvedValue(false);
      const node = createMockNode('createLorebookNode', { worldName: 'Existing Lorebook' });

      await expect(execute(node, {}, context)).rejects.toThrow(
        'Failed to create lorebook "Existing Lorebook". It might already exist.',
      );
    });
  });
});

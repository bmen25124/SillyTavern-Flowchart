import { jest } from '@jest/globals';
import { SpecFlow, SpecNode } from '../../flow-spec.js';
import { FlowRunnerDependencies, NodeExecutorContext } from '../../NodeExecutor.js';

export const mockDependencies = (): jest.Mocked<FlowRunnerDependencies> => ({
  getBaseMessagesForProfile: jest.fn(),
  makeSimpleRequest: jest.fn(),
  makeStructuredRequest: jest.fn(),
  getSillyTavernContext: jest.fn(),
  createCharacter: jest.fn(),
  saveCharacter: jest.fn(),
  st_createNewWorldInfo: jest.fn(),
  applyWorldInfoEntry: jest.fn(),
  getWorldInfos: jest.fn(),
  sendChatMessage: jest.fn(),
  deleteMessage: jest.fn(),
  saveChat: jest.fn(),
  st_updateMessageBlock: jest.fn(),
  st_runRegexScript: jest.fn(),
  executeSlashCommandsWithOptions: jest.fn(),
  executeSubFlow: jest.fn(),
});

export const createMockContext = (
  overrides: Partial<NodeExecutorContext> = {},
  dependencies: jest.Mocked<FlowRunnerDependencies> = mockDependencies(),
): NodeExecutorContext => ({
  flow: { nodes: [], edges: [] } as SpecFlow,
  dependencies,
  executionVariables: new Map<string, any>(),
  depth: 0,
  ...overrides,
});

export const createMockNode = (type: string, data: any): SpecNode => ({
  id: 'test-node',
  type,
  data,
});

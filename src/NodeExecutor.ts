import { SpecFlow, SpecNode } from './flow-spec.js';
import { Character, SillyTavernContext } from 'sillytavern-utils-lib/types';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import { z } from 'zod';
import { ExecutionReport } from './LowLevelFlowRunner.js';

export interface FlowRunnerDependencies {
  getBaseMessagesForProfile: (profileId: string, options?: any) => Promise<any[]>;
  makeSimpleRequest: (
    profileId: string,
    messages: any[],
    maxResponseToken: number,
    onStream?: (data: { chunk: string; fullText: string }) => Promise<void> | void,
    signal?: AbortSignal,
  ) => Promise<string>;
  makeStructuredRequest: (
    profileId: string,
    messages: any[],
    schema: z.ZodObject<any>,
    schemaName: string,
    promptEngineeringMode: any,
    maxResponseToken: number,
    signal?: AbortSignal,
  ) => Promise<any>;
  getSillyTavernContext: () => SillyTavernContext;
  createCharacter: (data: any) => Promise<void>;
  saveCharacter: (
    data: Partial<Character> & {
      avatar: string;
    },
  ) => Promise<void>;
  st_createNewWorldInfo: (worldName: string) => Promise<boolean>;
  applyWorldInfoEntry: (options: {
    entry: WIEntry;
    selectedWorldName: string;
    operation?: 'add' | 'update' | 'auto';
  }) => Promise<{ entry: WIEntry; operation: 'add' | 'update' }>;
  getWorldInfos: (
    include: ('all' | 'global' | 'character' | 'chat' | 'persona')[],
  ) => Promise<Record<string, WIEntry[]>>;
  sendChatMessage: (message: string, role: 'user' | 'assistant' | 'system', name?: string) => Promise<any>;
  deleteMessage: (messageId: number) => Promise<void>;
  hideChatMessageRange: (start: number, end: number, unhide: boolean) => Promise<void>;
  saveChat: () => Promise<void>;
  st_updateMessageBlock: (messageId: number, message: any, options?: { rerenderMessage?: boolean }) => void;
  st_runRegexScript: (script: any, content: string) => string;
  st_setLocalVariable: (name: string, value: unknown) => Promise<void> | void;
  st_getLocalVariable: (name: string) => Promise<unknown> | unknown;
  st_setGlobalVariable: (name: string, value: unknown) => Promise<void> | void;
  st_getGlobalVariable: (name: string) => Promise<unknown> | unknown;
  executeSlashCommandsWithOptions: (text: string, options?: any) => Promise<any>;
  executeSubFlow: (
    flowId: string,
    initialInput: Record<string, any>,
    depth: number,
    executionPath: string[],
    runId: string,
  ) => Promise<ExecutionReport>;
  getChatInputValue: () => string;
  updateChatInputValue: (value: string) => void;
  promptUser: (message: string, defaultValue?: string) => Promise<string | null>;
  confirmUser: (message: string) => Promise<boolean>;
}

export type NodeExecutorContext = {
  runId: string;
  flow: SpecFlow;
  dependencies: FlowRunnerDependencies;
  executionVariables: Map<string, any>;
  depth: number;
  signal?: AbortSignal;
  executionPath: string[];
};

export type NodeExecutor = (
  node: SpecNode,
  input: Record<string | symbol, any>,
  context: NodeExecutorContext,
) => Promise<any>;

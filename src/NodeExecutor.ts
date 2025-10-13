import { SpecFlow, SpecNode } from './flow-spec.js';
import { SillyTavernContext } from 'sillytavern-utils-lib/types';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import { z } from 'zod';
import { ExecutionReport } from './LowLevelFlowRunner.js';

export interface FlowRunnerDependencies {
  getBaseMessagesForProfile: (profileId: string, options?: any) => Promise<any[]>;
  makeSimpleRequest: (profileId: string, messages: any[], maxResponseToken: number) => Promise<string>;
  makeStructuredRequest: (
    profileId: string,
    messages: any[],
    schema: z.ZodObject<any>,
    schemaName: string,
    promptEngineeringMode: any,
    maxResponseToken: number,
  ) => Promise<any>;
  getSillyTavernContext: () => SillyTavernContext;
  createCharacter: (data: any) => Promise<void>;
  saveCharacter: (data: any) => Promise<void>;
  st_createNewWorldInfo: (worldName: string) => Promise<boolean>;
  applyWorldInfoEntry: (options: {
    entry: WIEntry;
    selectedWorldName: string;
    operation?: 'add' | 'update' | 'auto';
  }) => Promise<{ entry: WIEntry; operation: 'add' | 'update' }>;
  getWorldInfos: (
    include: ('all' | 'global' | 'character' | 'chat' | 'persona')[],
  ) => Promise<Record<string, WIEntry[]>>;
  sendChatMessage: (message: string, role: 'user' | 'assistant' | 'system', name?: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  saveChat: () => Promise<void>;
  st_updateMessageBlock: (messageId: number, message: any, options?: { rerenderMessage?: boolean }) => void;
  st_runRegexScript: (script: any, content: string) => string;
  executeSlashCommandsWithOptions: (text: string, options?: any) => Promise<any>;
  executeSubFlow: (flowId: string, initialInput: Record<string, any>, depth: number) => Promise<ExecutionReport>;
}

export type NodeExecutorContext = {
  flow: SpecFlow;
  dependencies: FlowRunnerDependencies;
  executionVariables: Map<string, any>;
  depth: number;
};

export type NodeExecutor = (
  node: SpecNode,
  input: Record<string, any> | any,
  context: NodeExecutorContext,
) => Promise<any>;

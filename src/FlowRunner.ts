import { EventNameParameters } from './flow-types.js';
import { sendChatMessage, st_createNewWorldInfo, st_echo, st_runRegexScript } from 'sillytavern-utils-lib/config';
import { validateFlow } from './validator.js';
import { makeSimpleRequest, getBaseMessagesForProfile, makeStructuredRequest } from './api.js';
import { LowLevelFlowRunner, ExecutionReport } from './LowLevelFlowRunner.js';
import { createCharacter, saveCharacter, applyWorldInfoEntry, getWorldInfos } from 'sillytavern-utils-lib';
import { eventEmitter } from './events.js';
import { settingsManager, st_updateMessageBlock } from './config.js';
import { useFlowRunStore } from './components/popup/flowRunStore.js';
import { registrator } from './components/nodes/autogen-imports.js';
import { FlowRunnerDependencies } from './NodeExecutor.js';
import { SlashCommandNodeData } from './components/nodes/SlashCommandNode/definition.js';
import { safeJsonStringify } from './utils/safeJsonStringify.js';

const HISTORY_STORAGE_KEY = 'flowchart_execution_history';
const MAX_HISTORY_LENGTH = 50;
const MAX_STRING_LENGTH_IN_HISTORY = 2048;
const CHARACTER_FIELDS_TO_LOG = ['name', 'description', 'first_mes', 'personality', 'scenario', 'tags', 'avatar'];

type StoredExecutionReport = ExecutionReport & { flowId: string; timestamp: string };

function loadHistory(): (ExecutionReport & { flowId: string; timestamp: Date })[] {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!saved) return [];
    const parsed: StoredExecutionReport[] = JSON.parse(saved);
    return parsed.map((item) => ({ ...item, timestamp: new Date(item.timestamp) }));
  } catch (e) {
    console.error('[FlowChart] Failed to load execution history:', e);
    return [];
  }
}

function sanitizeAndTruncateForHistory(value: any): any {
  if (typeof value === 'string' && value.length > MAX_STRING_LENGTH_IN_HISTORY) {
    return value.substring(0, MAX_STRING_LENGTH_IN_HISTORY) + `... [truncated]`;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeAndTruncateForHistory);
  }
  if (typeof value === 'object' && value !== null) {
    if ('name' in value && 'spec' in value && 'spec_version' in value) {
      const sanitizedChar: Record<string, any> = {};
      for (const key of CHARACTER_FIELDS_TO_LOG) {
        if (key in value) {
          sanitizedChar[key] = value[key];
        }
      }
      sanitizedChar['...'] = '[character object sanitized]';
      return sanitizedChar;
    }

    const newObj: Record<string, any> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        newObj[key] = sanitizeAndTruncateForHistory(value[key]);
      }
    }
    return newObj;
  }
  return value;
}

function sanitizeReportForHistory(report: ExecutionReport): ExecutionReport {
  return {
    ...report,
    executedNodes: report.executedNodes.map((nodeReport) => ({
      ...nodeReport,
      input: sanitizeAndTruncateForHistory(nodeReport.input),
      output: sanitizeAndTruncateForHistory(nodeReport.output),
    })),
  };
}

function saveHistory(history: (ExecutionReport & { flowId: string; timestamp: Date })[]) {
  try {
    const storable = history.map((item) => ({
      ...item,
      timestamp: item.timestamp.toISOString(),
    }));
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(storable));
  } catch (e: any) {
    console.error('[FlowChart] Failed to save execution history:', e);
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      st_echo('error', 'FlowChart: Could not save execution history. Storage quota exceeded.');
    }
  }
}

export let executionHistory = loadHistory();

export function clearExecutionHistory() {
  executionHistory = [];
  localStorage.removeItem(HISTORY_STORAGE_KEY);
}

class FlowRunner {
  private registeredListeners: Map<string, (...args: any[]) => void> = new Map();
  private registeredCommands: string[] = [];
  private lowLevelRunner: LowLevelFlowRunner;
  private isListeningToEvents: boolean = false;
  private isExecuting: boolean = false;
  private abortController: AbortController | null = null;
  private dependencies: FlowRunnerDependencies;

  constructor() {
    this.lowLevelRunner = new LowLevelFlowRunner(registrator.nodeExecutors);
    this.dependencies = this.getDependencies();
    this.setupEventListeners();
  }

  private getDependencies(): FlowRunnerDependencies {
    return {
      getBaseMessagesForProfile,
      makeSimpleRequest,
      makeStructuredRequest,
      getSillyTavernContext: () => SillyTavern.getContext(),
      createCharacter,
      saveCharacter: (character) => saveCharacter(character, true),
      st_createNewWorldInfo: (worldName) => st_createNewWorldInfo(worldName, { interactive: true }),
      applyWorldInfoEntry,
      getWorldInfos,
      sendChatMessage: (message, role, name) => sendChatMessage(message, role, name),
      deleteMessage: (messageId) => SillyTavern.getContext().deleteMessage(messageId),
      saveChat: () => SillyTavern.getContext().saveChat(),
      st_updateMessageBlock: (messageId, message, options) => st_updateMessageBlock(messageId, message, options),
      st_runRegexScript: (script, content) => st_runRegexScript(script, content),
      executeSlashCommandsWithOptions: (text) => SillyTavern.getContext().executeSlashCommandsWithOptions(text),
      executeSubFlow: (flowId, initialInput, depth) => this.executeFlow(flowId, initialInput, depth),
    };
  }

  private setupEventListeners() {
    if (this.isListeningToEvents) return;
    eventEmitter.on('flow:run:start', ({ runId }) => useFlowRunStore.getState().startRun(runId));
    eventEmitter.on('node:run:start', ({ runId, nodeId }) => useFlowRunStore.getState().setActiveNode(runId, nodeId));
    eventEmitter.on('node:run:end', ({ runId, nodeId, report }) =>
      useFlowRunStore.getState().addNodeReport(runId, nodeId, report),
    );
    eventEmitter.on('flow:run:end', ({ runId, status, executedNodes }) =>
      useFlowRunStore.getState().endRun(runId, status, executedNodes),
    );
    this.isListeningToEvents = true;
  }

  reinitialize() {
    const {
      eventSource,
      SlashCommandParser,
      SlashCommand,
      SlashCommandArgument,
      SlashCommandNamedArgument,
      ARGUMENT_TYPE,
    } = SillyTavern.getContext();
    for (const [eventType, listener] of this.registeredListeners.entries()) {
      eventSource.removeListener(eventType as any, listener);
    }
    this.registeredListeners.clear();

    this.registeredCommands.forEach((cmd) => delete SlashCommandParser.commands[cmd]);
    this.registeredCommands = [];

    const settings = settingsManager.getSettings();
    if (!settings.enabled) {
      return;
    }

    const eventTriggers: Record<string, { flowId: string; nodeId: string }[]> = {};
    const enabledFlows = Object.entries(settings.flows).filter(([flowId]) => settings.enabledFlows[flowId] !== false);

    for (const [flowId, flow] of enabledFlows) {
      const { isValid, errors } = validateFlow(flow);
      if (!isValid) {
        console.warn(`Flow "${flowId}" is invalid and will not be run. Errors:`, errors);
        continue;
      }
      for (const node of flow.nodes) {
        if (node.data?.disabled) continue;
        if (node.type === 'triggerNode' && node.data.selectedEventType) {
          const eventType = node.data.selectedEventType;
          if (!eventTriggers[eventType]) eventTriggers[eventType] = [];
          eventTriggers[eventType].push({ flowId, nodeId: node.id });
        } else if (node.type === 'slashCommandNode') {
          const commandData = node.data as SlashCommandNodeData;
          const commandName = `flow-${commandData.commandName}`;
          if (this.registeredCommands.includes(commandName)) {
            console.warn(`[FlowChart] Slash command "${commandName}" is already registered. Skipping from ${flowId}.`);
            continue;
          }

          const namedArgs = commandData.arguments
            .filter((arg) => !arg.isUnnamed)
            .map((arg) =>
              SlashCommandNamedArgument.fromProps({
                name: arg.name,
                description: arg.description,
                typeList: [ARGUMENT_TYPE[arg.type.toUpperCase() as keyof typeof ARGUMENT_TYPE]],
                isRequired: arg.isRequired,
                defaultValue: arg.defaultValue,
              }),
            );

          const unnamedArgs = commandData.arguments
            .filter((arg) => arg.isUnnamed)
            .map((arg) =>
              SlashCommandArgument.fromProps({
                description: arg.description,
                typeList: [ARGUMENT_TYPE[arg.type.toUpperCase() as keyof typeof ARGUMENT_TYPE]],
                isRequired: arg.isRequired,
                acceptsMultiple: arg.type === 'list' || arg.name.endsWith('...'), // Convention
              }),
            );

          const cmd = SlashCommand.fromProps({
            name: commandName,
            helpString: commandData.helpText,
            unnamedArgumentList: unnamedArgs,
            namedArgumentList: namedArgs,
            callback: (named: Record<string, any>, unnamed: string | string[]) =>
              this.executeFlowFromSlashCommand(flowId, node.id, named, unnamed),
          });

          SlashCommandParser.addCommandObject(cmd);
          this.registeredCommands.push(commandName);
        }
      }
    }

    // Register global /flow-run command
    const globalCommand = SlashCommand.fromProps({
      name: 'flow-run',
      helpString: 'Manually runs a FlowChart flow.',
      unnamedArgumentList: [
        SlashCommandArgument.fromProps({ description: 'The name of the flow to run.', isRequired: true }),
        SlashCommandArgument.fromProps({ description: 'An optional JSON string for initial parameters.' }),
      ],
      callback: (_: any, unnamed: any) => {
        const [flowId, paramsJson] = unnamed as string[];
        let params = {};
        if (paramsJson) {
          try {
            params = JSON.parse(paramsJson);
          } catch (e) {
            return `Error: Invalid JSON parameters provided for flow "${flowId}".`;
          }
        }
        return this.runFlowManually(flowId, params);
      },
    });
    SlashCommandParser.addCommandObject(globalCommand);
    this.registeredCommands.push('flow-run');

    for (const eventType in eventTriggers) {
      const listener = (...args: any[]) => {
        st_echo('info', `FlowChart: Event "${eventType}" triggered.`);
        for (const trigger of eventTriggers[eventType]) {
          this.executeFlowFromEvent(trigger.flowId, trigger.nodeId, args);
        }
      };
      eventSource.on(eventType as any, listener);
      this.registeredListeners.set(eventType, listener);
    }
  }

  private async executeFlow(flowId: string, initialInput: Record<string, any>, depth = 0): Promise<ExecutionReport> {
    if (depth > 10) {
      throw new Error('Flow execution depth limit exceeded (10). Possible infinite recursion.');
    }
    if (this.isExecuting && depth === 0) {
      st_echo('info', `FlowChart: Another flow is running. Trigger for "${flowId}" was ignored.`);
      return { executedNodes: [], error: { nodeId: 'N/A', message: 'Another flow is already running.' } };
    }
    if (depth === 0) {
      this.isExecuting = true;
      this.abortController = new AbortController();
    }
    let report: ExecutionReport | undefined;

    try {
      const flow = settingsManager.getSettings().flows[flowId];
      if (!flow) throw new Error(`Flow with id ${flowId} not found.`);

      const runId = crypto.randomUUID();
      if (depth === 0) eventEmitter.emit('flow:run:start', { runId });

      report = await this.lowLevelRunner.executeFlow(
        runId,
        flow,
        initialInput,
        this.dependencies,
        depth,
        this.abortController?.signal,
      );

      if (depth === 0) {
        if (report.error) {
          const isAbort = report.error.message.includes('aborted');
          if (isAbort) {
            st_echo('info', `Flow "${flowId}" was stopped.`);
          } else {
            st_echo('error', `Flow "${flowId}" failed: ${report.error.message}`);
          }
          eventEmitter.emit('flow:run:end', { runId, status: 'error', executedNodes: report.executedNodes });
        } else {
          eventEmitter.emit('flow:run:end', { runId, status: 'completed', executedNodes: report.executedNodes });
        }

        const sanitizedReport = sanitizeReportForHistory(report);
        executionHistory.unshift({ ...sanitizedReport, flowId, timestamp: new Date() });
        if (executionHistory.length > MAX_HISTORY_LENGTH) executionHistory.pop();
        saveHistory(executionHistory);
      }
    } catch (error: any) {
      console.error(`[FlowChart] Critical error during flow execution: ${error.message}`);
      report = { executedNodes: [], error: { nodeId: 'CRITICAL', message: error.message } };
    } finally {
      if (depth === 0) {
        this.isExecuting = false;
        this.abortController = null;
      }
    }
    return report!;
  }

  async executeFlowFromEvent(flowId: string, startNodeId: string, eventArgs: any[]) {
    const flow = settingsManager.getSettings().flows[flowId];
    const startNode = flow?.nodes.find((n) => n.id === startNodeId);
    if (!startNode) return;

    const eventType = startNode.data.selectedEventType as string;
    const paramNames = Object.keys(EventNameParameters[eventType] || {});
    const initialInput = Object.fromEntries(paramNames.map((name, index) => [name, eventArgs[index]]));

    return this.executeFlow(flowId, initialInput);
  }

  async executeFlowFromSlashCommand(
    flowId: string,
    _startNodeId: string,
    namedArgs: Record<string, any>,
    unnamedArgs: string | string[],
  ) {
    const initialInput = { ...namedArgs };
    if (Array.isArray(unnamedArgs)) {
      initialInput['unnamed'] = unnamedArgs;
      initialInput['unnamed_full'] = unnamedArgs.join(' ');
    } else if (typeof unnamedArgs === 'string') {
      initialInput['unnamed'] = [unnamedArgs];
      initialInput['unnamed_full'] = unnamedArgs;
    }
    const report = await this.executeFlow(flowId, initialInput);
    if (report?.error) {
      return `Flow Error: ${report.error.message}`;
    }
    if (report?.lastOutput === undefined || report?.lastOutput === null) {
      return '';
    }
    if (typeof report.lastOutput === 'object') {
      return safeJsonStringify(report.lastOutput);
    }
    return String(report.lastOutput);
  }

  async runFlowManually(flowId: string, params?: Record<string, any>) {
    const settings = settingsManager.getSettings();
    const flow = settings.flows[flowId];
    if (!flow) {
      st_echo('error', `Flow "${flowId}" not found for manual run.`);
      return;
    }
    if (settings.enabledFlows[flowId] === false) {
      st_echo('error', `Flow "${flowId}" is disabled and cannot be run.`);
      return;
    }

    if (params) {
      return this.executeFlow(flowId, params);
    }

    const manualTriggers = flow.nodes.filter((node) => node.type === 'manualTriggerNode');
    if (manualTriggers.length > 0) {
      for (const triggerNode of manualTriggers) {
        let initialInput = {};
        try {
          initialInput = JSON.parse(triggerNode.data.payload);
        } catch (e) {
          st_echo('error', `Invalid JSON in Manual Trigger node ${triggerNode.id}. Skipping.`);
          continue;
        }
        await this.executeFlow(flowId, initialInput);
      }
    } else {
      await this.executeFlow(flowId, {});
    }
  }

  public abortCurrentRun() {
    this.abortController?.abort();
  }
}

export const flowRunner = new FlowRunner();

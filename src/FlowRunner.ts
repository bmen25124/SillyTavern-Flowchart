import { EventNameParameters } from './flow-types.js';
import { sendChatMessage, st_createNewWorldInfo, st_runRegexScript } from 'sillytavern-utils-lib/config';
import { validateFlow } from './validator.js';
import { makeSimpleRequest, getBaseMessagesForProfile, makeStructuredRequest } from './api.js';
import { LowLevelFlowRunner, ExecutionReport } from './LowLevelFlowRunner.js';
import { createCharacter, saveCharacter, applyWorldInfoEntry, getWorldInfos } from 'sillytavern-utils-lib';
import { eventEmitter } from './events.js';
import { settingsManager, st_hideChatMessageRange, st_updateMessageBlock } from './config.js';
import { useFlowRunStore } from './components/popup/flowRunStore.js';
import { registrator } from './components/nodes/autogen-imports.js';
import { FlowRunnerDependencies } from './NodeExecutor.js';
import { SlashCommandNodeData } from './components/nodes/SlashCommandNode/definition.js';
import { safeJsonStringify } from './utils/safeJsonStringify.js';
import { notify } from './utils/notify.js';
import { FLOW_RUN_COMMAND } from './constants.js';

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
    localStorage.setItem(HISTORY_STORAGE_KEY, safeJsonStringify(storable, 0));
  } catch (e: any) {
    console.error('[FlowChart] Failed to save execution history:', e);
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      notify('error', 'FlowChart: Could not save execution history. Storage quota exceeded.', 'execution');
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
  private abortController: AbortController | null = null;
  private dependencies: FlowRunnerDependencies;

  private isExecuting: boolean = false;
  private flowQueue: {
    flowId: string;
    initialInput: Record<string, any>;
    options: { startNodeId?: string; endNodeId?: string };
  }[] = [];

  constructor() {
    this.lowLevelRunner = new LowLevelFlowRunner(registrator.nodeExecutors);
    this.dependencies = this.getDependencies();
    this.setupEventListeners();
  }

  private getDependencies(): FlowRunnerDependencies {
    const { Popup } = SillyTavern.getContext();
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
      hideChatMessageRange: st_hideChatMessageRange,
      saveChat: () => SillyTavern.getContext().saveChat(),
      st_updateMessageBlock: (messageId, message, options) => st_updateMessageBlock(messageId, message, options),
      st_runRegexScript: (script, content) => st_runRegexScript(script, content),
      executeSlashCommandsWithOptions: (text) => SillyTavern.getContext().executeSlashCommandsWithOptions(text),
      executeSubFlow: (flowId, initialInput, depth, executionPath) =>
        this.executeFlow(flowId, initialInput, depth, {}, executionPath),
      promptUser: (message, defaultValue) => Popup.show.input('Question', message, defaultValue),
      confirmUser: (message) => Popup.show.confirm('Confirm', message),
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
    const enabledFlows = Object.values(settings.flows).filter((flow) => flow.enabled);

    for (const { id: flowId, name, flow, allowDangerousExecution } of enabledFlows) {
      const { isValid, errors } = validateFlow(flow, allowDangerousExecution, flowId);
      if (!isValid) {
        console.warn(`Flow "${name}" (${flowId}) is invalid and will not be run. Errors:`, errors);
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

          // Check for reserved command names
          const reservedNames = ['run'];
          if (reservedNames.includes(commandData.commandName.toLowerCase())) {
            console.warn(`[FlowChart] Slash command "${commandName}" uses a reserved name and will not be registered.`);
            continue;
          }

          // Check if command already exists in SillyTavern
          if (SlashCommandParser.commands[commandName]) {
            console.warn(
              `[FlowChart] Slash command "${commandName}" already exists in SillyTavern and will not be registered.`,
            );
            continue;
          }

          if (this.registeredCommands.includes(commandName)) {
            console.warn(`[FlowChart] Slash command "${commandName}" is already registered. Skipping from ${name}.`);
            continue;
          }

          const namedArgs = commandData.arguments.map((arg) =>
            SlashCommandNamedArgument.fromProps({
              name: arg.name,
              description: arg.description,
              typeList: [ARGUMENT_TYPE[arg.type.toUpperCase() as keyof typeof ARGUMENT_TYPE]],
              isRequired: arg.isRequired,
              defaultValue: arg.defaultValue,
            }),
          );

          const cmd = SlashCommand.fromProps({
            name: commandName,
            helpString: commandData.helpText,
            unnamedArgumentList: [], // All other text is passed as a single string
            namedArgumentList: namedArgs,
            callback: (named: Record<string, any>, unnamed: string) =>
              this.executeFlowFromSlashCommand(flowId, node.id, named, unnamed),
          });

          SlashCommandParser.addCommandObject(cmd);
          this.registeredCommands.push(commandName);
        }
      }
    }

    // Register global /flow-run command
    const globalCommand = SlashCommand.fromProps({
      name: FLOW_RUN_COMMAND,
      helpString: 'Manually runs a FlowChart flow by its name.',
      unnamedArgumentList: [
        SlashCommandArgument.fromProps({ description: 'The name of the flow to run.', isRequired: true }),
        SlashCommandArgument.fromProps({ description: 'An optional JSON string for initial parameters.' }),
      ],
      callback: async (_: any, unnamed: any) => {
        const [flowName, paramsJson] = Array.isArray(unnamed) ? unnamed : [unnamed];
        const settings = settingsManager.getSettings();
        const flowEntry = Object.values(settings.flows).find((f) => f.name === flowName);

        if (!flowEntry) {
          return `Error: Flow with name "${flowName}" not found.`;
        }
        const flowId = flowEntry.id;

        let params = {};
        if (paramsJson) {
          try {
            params = JSON.parse(paramsJson);
          } catch (e) {
            return `Error: Invalid JSON parameters provided for flow "${flowName}".`;
          }
        }
        const report = await this.runFlowManually(flowId, params);
        if (report?.error) {
          return `Flow Error: ${report.error.message}`;
        }
        const output = report?.lastOutput;
        if (output === undefined || output === null) {
          return `Flow "${flowName}" executed successfully.`;
        }
        return typeof output === 'object' ? safeJsonStringify(output) : String(output);
      },
    });
    SlashCommandParser.addCommandObject(globalCommand);
    this.registeredCommands.push(FLOW_RUN_COMMAND);

    for (const eventType in eventTriggers) {
      const listener = (...args: any[]) => {
        for (const trigger of eventTriggers[eventType]) {
          this.executeFlowFromEvent(trigger.flowId, trigger.nodeId, args);
        }
      };
      eventSource.on(eventType as any, listener);
      this.registeredListeners.set(eventType, listener);
    }
  }

  private async _processQueue() {
    if (this.isExecuting || this.flowQueue.length === 0) {
      return;
    }

    this.isExecuting = true;
    const { flowId, initialInput, options } = this.flowQueue.shift()!;

    try {
      await this._executeFlowInternal(flowId, initialInput, 0, options);
    } catch (error) {
      console.error(`[FlowChart] Critical error during queued flow execution:`, error);
    } finally {
      this.isExecuting = false;
      // After finishing, immediately check if there's more work to do.
      this._processQueue();
    }
  }

  public async executeFlow(
    flowId: string,
    initialInput: Record<string, any>,
    depth = 0,
    options: { startNodeId?: string; endNodeId?: string } = {},
    executionPath: string[] = [],
  ): Promise<ExecutionReport> {
    const flowData = settingsManager.getSettings().flows.find((f) => f.id === flowId);
    if (!flowData) {
      throw new Error(`Flow with id ${flowId} not found.`);
    }

    if (depth > 10) {
      throw new Error('Flow execution depth limit exceeded (10). Possible infinite recursion.');
    }

    // Queue top-level triggers, execute sub-flows directly.
    if (depth === 0) {
      this.flowQueue.push({ flowId, initialInput, options });
      if (!this.isExecuting) {
        this._processQueue();
      } else {
        notify('info', `FlowChart: Another flow is running. "${flowData.name}" has been queued.`, 'execution');
      }
      // Top-level calls are fire-and-forget; results are handled by events.
      return { executedNodes: [], lastOutput: undefined };
    }

    // This is a sub-flow execution, run it directly.
    return this._executeFlowInternal(flowId, initialInput, depth, options, executionPath);
  }

  private async _executeFlowInternal(
    flowId: string,
    initialInput: Record<string, any>,
    depth: number,
    options: { startNodeId?: string; endNodeId?: string } = {},
    executionPath: string[] = [],
  ): Promise<ExecutionReport> {
    const flowData = settingsManager.getSettings().flows.find((f) => f.id === flowId);
    if (!flowData) {
      const errorMsg = `Flow with id ${flowId} not found.`;
      console.error(`[FlowChart] ${errorMsg}`);
      return { executedNodes: [], error: { nodeId: 'N/A', message: errorMsg } };
    }

    if (executionPath.includes(flowId)) {
      const cyclePath = [...executionPath, flowId].map(
        (id) => settingsManager.getSettings().flows.find((f) => f.id === id)?.name || id,
      );
      const errorMsg = `Circular sub-flow execution detected: ${cyclePath.join(' -> ')}`;
      notify('error', errorMsg, 'execution');
      return { executedNodes: [], error: { nodeId: 'N/A', message: errorMsg } };
    }

    if (!flowData.enabled && depth > 0) {
      // Sub-flows can't run if disabled. Top-level flows are already filtered in reinitialize.
      const errorMsg = `Flow "${flowData.name}" is disabled and cannot be run as a sub-flow.`;
      notify('error', errorMsg, 'execution');
      return { executedNodes: [], error: { nodeId: 'N/A', message: errorMsg } };
    }

    const { isValid, errors } = validateFlow(flowData.flow, flowData.allowDangerousExecution, flowId);
    if (!isValid) {
      const errorMessage = `Flow "${flowData.name}" is invalid and cannot be run. Errors: ${errors.join(', ')}`;
      notify('error', errorMessage, 'execution');
      console.error(`[FlowChart] ${errorMessage}`);
      return { executedNodes: [], error: { nodeId: 'N/A', message: `Validation failed: ${errors[0]}` } };
    }

    const flow = flowData.flow;
    const newExecutionPath = [...executionPath, flowId];

    if (depth === 0) {
      this.abortController = new AbortController();
    }
    let report: ExecutionReport | undefined;

    try {
      const runId = crypto.randomUUID();
      if (depth === 0) eventEmitter.emit('flow:run:start', { runId });

      report = await this.lowLevelRunner.executeFlow(
        runId,
        flow,
        initialInput,
        this.dependencies,
        depth,
        this.abortController?.signal,
        options,
        newExecutionPath, // Pass the path down
      );

      if (depth === 0) {
        if (report.error) {
          const isAbort = report.error.message.includes('aborted');
          if (isAbort) {
            notify('info', `Flow "${flowData.name}" was stopped.`, 'execution');
          } else {
            notify('error', `Flow "${flowData.name}" failed: ${report.error.message}`, 'execution');
          }
          eventEmitter.emit('flow:run:end', { runId, status: 'error', executedNodes: report.executedNodes });
        } else {
          eventEmitter.emit('flow:run:end', { runId, status: 'completed', executedNodes: report.executedNodes });
        }

        const sanitizedReport = sanitizeReportForHistory(report);
        executionHistory.unshift({ ...sanitizedReport, flowId: flowData.name, timestamp: new Date() });
        if (executionHistory.length > MAX_HISTORY_LENGTH) executionHistory.pop();
        saveHistory(executionHistory);
      }
    } catch (error: any) {
      console.error(`[FlowChart] Critical error during flow execution: ${error.message}`);
      report = { executedNodes: [], error: { nodeId: 'CRITICAL', message: error.message } };
    } finally {
      if (depth === 0) {
        this.abortController = null;
      }
    }
    return report!;
  }

  async executeFlowFromEvent(flowId: string, startNodeId: string, eventArgs: any[]) {
    const flow = settingsManager.getSettings().flows.find((f) => f.id === flowId)?.flow;
    if (!flow) {
      console.error(`[FlowChart] Flow with id ${flowId} not found for event trigger.`);
      return;
    }
    const startNode = flow?.nodes.find((n) => n.id === startNodeId);
    if (!startNode) return;

    const eventType = startNode.data.selectedEventType as string;
    const eventParams = EventNameParameters[eventType];
    let initialInput: Record<string, any>;

    if (eventParams) {
      const paramNames = Object.keys(eventParams);
      initialInput = Object.fromEntries(paramNames.map((name, index) => [name, eventArgs[index]]));
    } else {
      // Fallback for unknown events
      initialInput = { allArgs: eventArgs };
      eventArgs.forEach((arg, index) => {
        initialInput[`arg${index}`] = arg;
      });
    }

    return this.executeFlow(flowId, initialInput, 0);
  }

  async executeFlowFromSlashCommand(
    flowId: string,
    startNodeId: string,
    namedArgs: Record<string, any>,
    unnamedArgs: string,
  ) {
    const flowData = settingsManager.getSettings().flows.find((f) => f.id === flowId);
    if (!flowData) {
      return `Error: Flow with ID "${flowId}" not found.`;
    }

    const slashCommandNode = flowData.flow.nodes.find((node) => node.id === startNodeId);
    if (!slashCommandNode || slashCommandNode.type !== 'slashCommandNode') {
      return `Error: Could not find the corresponding Slash Command trigger in flow "${flowData.name}".`;
    }
    const nodeData = slashCommandNode.data as SlashCommandNodeData;

    const processedArgs: Record<string, any> = {};

    for (const argDef of nodeData.arguments) {
      const rawValue = namedArgs[argDef.name];

      if (rawValue === undefined || rawValue === null) {
        if (argDef.isRequired) {
          return `Error: Missing required argument "${argDef.name}".`;
        }
        continue; // Optional argument not provided.
      }

      try {
        switch (argDef.type) {
          case 'number':
            const num = parseFloat(rawValue);
            if (isNaN(num)) {
              throw new Error(`'${rawValue}' is not a valid number.`);
            }
            processedArgs[argDef.name] = num;
            break;
          case 'boolean':
            if (typeof rawValue === 'boolean') {
              processedArgs[argDef.name] = rawValue;
            } else {
              const lowerVal = String(rawValue).toLowerCase();
              if (lowerVal === 'true') {
                processedArgs[argDef.name] = true;
              } else if (lowerVal === 'false') {
                processedArgs[argDef.name] = false;
              } else {
                throw new Error(`'${rawValue}' is not a valid boolean (true/false).`);
              }
            }
            break;
          case 'list':
            processedArgs[argDef.name] = String(rawValue)
              .split(',')
              .map((s) => s.trim());
            break;
          case 'string':
          default:
            processedArgs[argDef.name] = String(rawValue);
            break;
        }
      } catch (e: any) {
        return `Error processing argument "${argDef.name}": ${e.message}`;
      }
    }

    const initialInput = { ...processedArgs, unnamed: unnamedArgs || '' };
    const report = await this._executeFlowInternal(flowId, initialInput, 0);

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
    const flowData = settings.flows.find((f) => f.id === flowId);
    if (!flowData) {
      notify('error', `Flow with ID "${flowId}" not found for manual run.`, 'execution');
      return;
    }
    const flow = settings.flows.find((f) => f.id === flowId);
    if (!flow?.enabled) {
      notify('error', `Flow "${flowData.name}" is disabled and cannot be run.`, 'execution');
      return;
    }

    return this.executeFlow(flowId, params ?? {}, 0);
  }

  public async runFlowFromNode(flowId: string, startNodeId: string) {
    const settings = settingsManager.getSettings();
    const flowData = settings.flows.find((f) => f.id === flowId);
    if (!flowData) {
      notify('error', `Flow with ID "${flowId}" not found for manual run.`, 'execution');
      return;
    }
    const flow = settings.flows.find((f) => f.id === flowId);
    if (!flow?.enabled) {
      notify('error', `Flow "${flowData.name}" is disabled and cannot be run.`, 'execution');
      return;
    }
    notify('info', `FlowChart: Running flow "${flowData.name}" from node ${startNodeId}.`, 'execution');
    return this.executeFlow(flowId, {}, 0, { startNodeId });
  }

  public async runFlowToNode(flowId: string, endNodeId: string) {
    const settings = settingsManager.getSettings();
    const flowData = settings.flows.find((f) => f.id === flowId);
    if (!flowData) {
      notify('error', `Flow with ID "${flowId}" not found for manual run.`, 'execution');
      return;
    }
    const flow = settings.flows.find((f) => f.id === flowId);
    if (!flow?.enabled) {
      notify('error', `Flow "${flowData.name}" is disabled and cannot be run.`, 'execution');
      return;
    }
    notify('info', `FlowChart: Running flow "${flowData.name}" to node ${endNodeId}.`, 'execution');
    return this.executeFlow(flowId, {}, 0, { endNodeId });
  }

  public abortCurrentRun() {
    this.abortController?.abort();
  }
}

export const flowRunner = new FlowRunner();

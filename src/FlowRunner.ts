import { z } from 'zod';
import { EventNameParameters } from './flow-types.js';
import {
  sendChatMessage,
  st_createNewWorldInfo,
  st_getGlobalVariable,
  st_getLocalVariable,
  st_runRegexScript,
  st_setGlobalVariable,
  st_setLocalVariable,
} from 'sillytavern-utils-lib/config';
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
import { FLOW_RUN_COMMAND, FLOW_STOP_COMMAND } from './constants.js';
import { generateUUID } from './utils/uuid.js';
import { renderAllQrButtons } from './components/nodes/QuickReplyTriggerNode/definition.js';
import { EventNames } from 'sillytavern-utils-lib/types';

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
    console.error('[Flowchart] Failed to load execution history:', e);
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
    console.error('[Flowchart] Failed to save execution history:', e);
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      notify('error', 'Flowchart: Could not save execution history. Storage quota exceeded.', 'execution');
    }
  }
}

export let executionHistory = loadHistory();

export function clearExecutionHistory() {
  executionHistory = [];
  localStorage.removeItem(HISTORY_STORAGE_KEY);
}

export class FlowRunner {
  private registeredEventListeners: Map<string, (...args: any[]) => void> = new Map();
  private registeredStaticCommands: string[] = [];
  private lowLevelRunner: LowLevelFlowRunner;
  private isListeningToEvents: boolean = false;
  private areDomListenersAttached: boolean = false;
  private abortController: AbortController | null = null;
  private dependencies: FlowRunnerDependencies;

  private isExecuting: boolean = false;
  private currentlyExecutingFlowId: string | null = null;
  private flowQueue: {
    flowId: string;
    initialInput: Record<string, any>;
    options: { startNodeId?: string; endNodeId?: string; activatedNodeId?: string };
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
      st_setLocalVariable: (name, value) => st_setLocalVariable(name, value),
      st_getLocalVariable: (name) => st_getLocalVariable(name),
      st_setGlobalVariable: (name, value) => st_setGlobalVariable(name, value),
      st_getGlobalVariable: (name) => st_getGlobalVariable(name),
      executeSlashCommandsWithOptions: (text) => SillyTavern.getContext().executeSlashCommandsWithOptions(text),
      executeSubFlow: async (flowId, initialInput, depth, executionPath, runId) => {
        const parentFlowId = this.currentlyExecutingFlowId;
        eventEmitter.emit('subflow:run:start', { subFlowId: flowId, parentFlowId });

        try {
          const report = await this._executeFlowInternal(flowId, initialInput, depth, {}, executionPath, runId);
          return report;
        } finally {
          eventEmitter.emit('subflow:run:end', { subFlowId: flowId, parentFlowId });
        }
      },
      getChatInputValue: () => {
        const textarea = document.getElementById('send_textarea') as HTMLTextAreaElement;
        return textarea ? textarea.value : '';
      },
      updateChatInputValue: (value: string) => {
        const textarea = document.getElementById('send_textarea') as HTMLTextAreaElement;
        if (textarea) {
          textarea.value = value;
          // Dispatch an input event to make sure any listeners (like auto-resize) are triggered.
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      },
      promptUser: (message, defaultValue) => Popup.show.input('Question', message, defaultValue),
      confirmUser: (message) => Popup.show.confirm('Confirm', message),
    };
  }

  private handleMessageToolbarClick(event: MouseEvent) {
    const button = (event.target as HTMLElement).closest('.flowchart-message-toolbar-button');
    if (!button) return;

    const { flowId, nodeId } = (button as HTMLElement).dataset;
    if (!flowId || !nodeId) return;

    const messageBlock = (event.target as HTMLElement).closest('.mes');
    const messageIdAttr = messageBlock?.getAttribute('mesid');
    if (!messageIdAttr) return;

    const messageId = Number(messageIdAttr);
    const message = SillyTavern.getContext().chat[messageId];
    if (!message) return;

    const initialInput = {
      messageId: messageId,
      messageContent: message.mes,
      messageObject: { ...message },
    };

    this.executeFlow(flowId, initialInput, 0, { activatedNodeId: nodeId });
  }

  private handleQrButtonClick(event: MouseEvent) {
    const button = (event.target as HTMLElement).closest('.flowchart-qr-button');
    if (!button) return;

    const { flowId, nodeId } = (button as HTMLElement).dataset;
    if (!flowId || !nodeId) return;

    this.executeFlow(flowId, {}, 0, { activatedNodeId: nodeId });
  }

  private setupEventListeners() {
    if (this.isListeningToEvents) return;
    const { eventSource } = SillyTavern.getContext();

    eventEmitter.on('flow:run:start', ({ runId }) => useFlowRunStore.getState().startRun(runId));
    eventEmitter.on('node:run:start', ({ runId, nodeId }) => useFlowRunStore.getState().setActiveNode(runId, nodeId));
    eventEmitter.on('node:run:end', ({ runId, nodeId, report }) =>
      useFlowRunStore.getState().addNodeReport(runId, nodeId, report),
    );
    eventEmitter.on('flow:run:end', ({ runId, status, executedNodes }) =>
      useFlowRunStore.getState().endRun(runId, status, executedNodes),
    );

    if (!this.areDomListenersAttached) {
      document.addEventListener('click', this.handleMessageToolbarClick.bind(this));
      document.addEventListener('click', this.handleQrButtonClick.bind(this));
      this.areDomListenersAttached = true;
    }

    // Add static listener for chat changes to re-render UI elements
    eventSource.on(EventNames.CHAT_CHANGED, renderAllQrButtons);

    this.isListeningToEvents = true;
  }

  reinitialize() {
    const { eventSource, SlashCommandParser, SlashCommand, SlashCommandArgument } = SillyTavern.getContext();

    // 1. Unregister all existing triggers and listeners.
    for (const [eventType, listener] of this.registeredEventListeners.entries()) {
      eventSource.removeListener(eventType as any, listener);
    }
    this.registeredEventListeners.clear();

    this.registeredStaticCommands.forEach((cmd) => delete SlashCommandParser.commands[cmd]);
    this.registeredStaticCommands = [];

    const triggerNodeDefinitions = Array.from(registrator.nodeDefinitionMap.values()).filter(
      (def) => def.unregisterAll,
    );
    triggerNodeDefinitions.forEach((def) => def.unregisterAll!());

    // 2. Check if the extension is enabled. If not, stop here.
    const settings = settingsManager.getSettings();
    if (!settings.enabled) {
      return;
    }

    // 3. Register triggers for all valid, enabled flows.
    const eventTriggers: Record<string, { flowId: string; nodeId: string }[]> = {};
    const enabledFlows = Object.values(settings.flows).filter((flow) => flow.enabled);

    for (const { id: flowId, name, flow, allowDangerousExecution } of enabledFlows) {
      const { isValid, errors } = validateFlow(flow, allowDangerousExecution, settings.flows, flowId);
      if (!isValid) {
        console.warn(`[Flowchart] Flow "${name}" (${flowId}) is invalid and will not be run. Errors:`, errors);
        continue;
      }
      for (const node of flow.nodes) {
        if (node.data?.disabled) continue;

        const definition = registrator.nodeDefinitionMap.get(node.type);

        // A. Handle UI-based triggers via their definition's `register` method.
        if (definition?.register) {
          try {
            definition.register(flowId, node, this);
          } catch (err) {
            console.error(`[Flowchart] Failed to register trigger for node ${node.id} in flow "${name}":`, err);
          }
        }
        // B. Handle event-based triggers by collecting them for the runner to manage.
        else if (node.type === 'triggerNode' && node.data.selectedEventType) {
          const eventType = node.data.selectedEventType;
          if (!eventTriggers[eventType]) eventTriggers[eventType] = [];
          eventTriggers[eventType].push({ flowId, nodeId: node.id });
        }
      }
    }

    // 4. Render UI elements that depend on all nodes being registered (e.g., QR buttons).
    renderAllQrButtons();

    // 5. Register global slash commands managed by the runner itself.
    const runCommand = SlashCommand.fromProps({
      name: FLOW_RUN_COMMAND,
      helpString: 'Manually runs a Flowchart flow by its name.',
      unnamedArgumentList: [
        SlashCommandArgument.fromProps({ description: 'The name of the flow to run.', isRequired: true }),
        SlashCommandArgument.fromProps({ description: 'An optional JSON string for initial parameters.' }),
      ],
      callback: async (_: any, unnamed: any) => {
        const [flowName, paramsJson] = Array.isArray(unnamed) ? unnamed : [unnamed];
        const flowEntry = Object.values(settings.flows).find((f) => f.name === flowName);

        if (!flowEntry) return `Error: Flow with name "${flowName}" not found.`;
        let params = {};
        if (paramsJson) {
          try {
            params = JSON.parse(paramsJson);
          } catch (e) {
            return `Error: Invalid JSON parameters provided for flow "${flowName}".`;
          }
        }
        const report = await this.runFlowManually(flowEntry.id, params);
        if (report?.error) return `Flow Error: ${report.error.message}`;
        const output = report?.lastOutput;
        if (output === undefined || output === null) return `Flow "${flowName}" executed successfully.`;
        return typeof output === 'object' ? safeJsonStringify(output) : String(output);
      },
    });
    SlashCommandParser.addCommandObject(runCommand);
    this.registeredStaticCommands.push(FLOW_RUN_COMMAND);

    const stopCommand = SlashCommand.fromProps({
      name: FLOW_STOP_COMMAND,
      helpString: 'Stops the currently running Flowchart flow and clears the queue.',
      callback: () => this.abortAllRuns(),
    });
    SlashCommandParser.addCommandObject(stopCommand);
    this.registeredStaticCommands.push(FLOW_STOP_COMMAND);

    // 6. Set up event listeners for the collected event-based triggers.
    for (const eventType in eventTriggers) {
      const listener = (...args: any[]) => {
        for (const trigger of eventTriggers[eventType]) {
          this.executeFlowFromEvent(trigger.flowId, trigger.nodeId, args);
        }
      };
      eventSource.on(eventType as any, listener);
      this.registeredEventListeners.set(eventType, listener);
    }
  }

  private async _processQueue() {
    if (this.isExecuting || this.flowQueue.length === 0) {
      return;
    }

    this.isExecuting = true;
    const { flowId, initialInput, options } = this.flowQueue.shift()!;
    this.currentlyExecutingFlowId = flowId;

    try {
      await this._executeFlowInternal(flowId, initialInput, 0, options);
    } catch (error) {
      console.error(`[Flowchart] Critical error during queued flow execution:`, error);
    } finally {
      this.isExecuting = false;
      this.currentlyExecutingFlowId = null;
      // After finishing, immediately check if there's more work to do.
      this._processQueue();
    }
  }

  public async executeFlow(
    flowId: string,
    initialInput: Record<string, any>,
    depth = 0,
    options: { startNodeId?: string; endNodeId?: string; activatedNodeId?: string } = {},
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
        notify('info', `Flowchart: Another flow is running. "${flowData.name}" has been queued.`, 'execution');
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
    options: { startNodeId?: string; endNodeId?: string; activatedNodeId?: string } = {},
    executionPath: string[] = [],
    runId?: string,
  ): Promise<ExecutionReport> {
    const flowData = settingsManager.getSettings().flows.find((f) => f.id === flowId);
    if (!flowData) {
      const errorMsg = `Flow with id ${flowId} not found.`;
      console.error(`[Flowchart] ${errorMsg}`);
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

    const { isValid, errors } = validateFlow(
      flowData.flow,
      flowData.allowDangerousExecution,
      settingsManager.getSettings().flows,
      flowId,
    );
    if (!isValid) {
      const errorMessage = `Flow "${flowData.name}" is invalid and cannot be run. Errors: ${errors.join(', ')}`;
      notify('error', errorMessage, 'execution');
      console.error(`[Flowchart] ${errorMessage}`);
      return { executedNodes: [], error: { nodeId: 'N/A', message: `Validation failed: ${errors[0]}` } };
    }

    const flow = flowData.flow;
    const newExecutionPath = [...executionPath, flowId];
    const isTopLevel = depth === 0;
    const currentRunId = runId || generateUUID();

    if (isTopLevel) {
      this.abortController = new AbortController();
    }
    let report: ExecutionReport | undefined;

    try {
      if (isTopLevel) eventEmitter.emit('flow:run:start', { runId: currentRunId });

      report = await this.lowLevelRunner.executeFlow(
        currentRunId,
        flow,
        initialInput,
        this.dependencies,
        depth,
        this.abortController?.signal,
        options,
        newExecutionPath, // Pass the path down
      );

      if (isTopLevel) {
        if (report.error) {
          const isAbort = report.error.message.includes('aborted');
          if (isAbort) {
            notify('info', `Flow "${flowData.name}" was stopped.`, 'execution');
          } else {
            notify('error', `Flow "${flowData.name}" failed: ${report.error.message}`, 'execution');
          }
          eventEmitter.emit('flow:run:end', {
            runId: currentRunId,
            status: 'error',
            executedNodes: report.executedNodes,
          });
        } else {
          eventEmitter.emit('flow:run:end', {
            runId: currentRunId,
            status: 'completed',
            executedNodes: report.executedNodes,
          });
        }

        const sanitizedReport = sanitizeReportForHistory(report);
        executionHistory.unshift({ ...sanitizedReport, flowId: flowData.name, timestamp: new Date() });
        if (executionHistory.length > MAX_HISTORY_LENGTH) executionHistory.pop();
        saveHistory(executionHistory);
      }
    } catch (error: any) {
      console.error(`[Flowchart] Critical error during flow execution: ${error.message}`);
      report = { executedNodes: [], error: { nodeId: 'CRITICAL', message: error.message } };
    } finally {
      if (isTopLevel) {
        this.abortController = null;
      }
    }
    return report!;
  }

  async executeFlowFromEvent(flowId: string, startNodeId: string, eventArgs: any[]) {
    const flowData = settingsManager.getSettings().flows.find((f) => f.id === flowId);
    if (!flowData || !flowData.flow) {
      console.error(`[Flowchart] Flow with id ${flowId} not found for event trigger.`);
      return;
    }
    const startNode = flowData.flow.nodes.find((n) => n.id === startNodeId);
    if (!startNode) return;

    const preventRecursive = startNode.data.preventRecursive ?? true;
    if (preventRecursive) {
      const isAlreadyRunning = this.isExecuting && this.currentlyExecutingFlowId === flowId;
      const isAlreadyQueued = this.flowQueue.some((item) => item.flowId === flowId);

      if (isAlreadyRunning || isAlreadyQueued) {
        console.log(
          `[Flowchart] Suppressing recursive event trigger for flow "${flowData.name}". It is already running or queued.`,
        );
        return;
      }
    }

    const eventType = startNode.data.selectedEventType as string;
    const eventParams = EventNameParameters[eventType];
    let initialInput: Record<string, any>;

    if (eventParams && Object.keys(eventParams).length > 0) {
      const rawInput = Object.fromEntries(Object.keys(eventParams).map((name, index) => [name, eventArgs[index]]));

      const combinedSchema = z.object(eventParams);
      const parsed = combinedSchema.safeParse(rawInput);

      if (!parsed.success) {
        console.error(`[Flowchart] Event arguments for "${eventType}" failed validation/coercion:`, parsed.error);
        notify('error', `Flow "${flowData.name}" could not start due to invalid event data.`, 'execution');
        return; // Stop execution
      }

      initialInput = parsed.data;
    } else {
      // Fallback for events with no defined params or unknown events
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
    const report = await this._executeFlowInternal(flowId, initialInput, 0, { activatedNodeId: startNodeId });

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
    return this.executeFlow(flowId, {}, 0, { endNodeId });
  }

  public abortCurrentRun() {
    this.abortController?.abort();
  }

  public abortAllRuns() {
    const queuedCount = this.flowQueue.length;
    const hasRunning = this.isExecuting && !!this.abortController && !this.abortController.signal.aborted;

    if (queuedCount > 0) {
      this.flowQueue = [];
    }

    if (hasRunning) {
      this.abortCurrentRun();
    }

    const parts: string[] = [];
    if (hasRunning) {
      parts.push('the current flow');
    }
    if (queuedCount > 0) {
      parts.push(`${queuedCount} queued flow${queuedCount > 1 ? 's' : ''}`);
    }

    const message =
      parts.length > 0
        ? `Flowchart: Stopped ${parts.join(' and ')}.`
        : 'Flowchart: No flows are currently running or queued.';

    notify('info', message, 'execution');
    return message;
  }
}

export const flowRunner = new FlowRunner();

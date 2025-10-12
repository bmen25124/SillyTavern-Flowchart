import { EventNameParameters } from './flow-types.js';
import { sendChatMessage, st_createNewWorldInfo, st_echo, st_runRegexScript } from 'sillytavern-utils-lib/config';
import { validateFlow } from './validator.js';
import { getBaseMessagesForProfile, makeStructuredRequest } from './api.js';
import { ExecutionReport, LowLevelFlowRunner } from './LowLevelFlowRunner.js';
import { createCharacter, saveCharacter, applyWorldInfoEntry, getWorldInfos } from 'sillytavern-utils-lib';
import { eventEmitter } from './events.js';
import { settingsManager, st_updateMessageBlock } from './config.js';

const HISTORY_STORAGE_KEY = 'flowchart_execution_history';
const MAX_HISTORY_LENGTH = 50;
const MAX_STRING_LENGTH_IN_HISTORY = 2048;

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

/**
 * Recursively truncates long strings within any given data structure.
 * This is to prevent localStorage quota errors when saving large execution reports.
 * @param value The data to process.
 * @returns The processed data with long strings truncated.
 */
function truncateValue(value: any): any {
  if (typeof value === 'string' && value.length > MAX_STRING_LENGTH_IN_HISTORY) {
    return value.substring(0, MAX_STRING_LENGTH_IN_HISTORY) + `... [truncated]`;
  }
  if (Array.isArray(value)) {
    return value.map(truncateValue);
  }
  if (typeof value === 'object' && value !== null) {
    const newObj: Record<string, any> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        newObj[key] = truncateValue(value[key]);
      }
    }
    return newObj;
  }
  return value;
}

function saveHistory(history: (ExecutionReport & { flowId: string; timestamp: Date })[]) {
  try {
    const storable = history.map((item) => ({
      ...item,
      executedNodes: item.executedNodes.map((nodeReport) => ({
        ...nodeReport,
        input: truncateValue(nodeReport.input),
        output: truncateValue(nodeReport.output),
      })),
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
  private lowLevelRunner: LowLevelFlowRunner;

  constructor() {
    this.lowLevelRunner = new LowLevelFlowRunner({
      getBaseMessagesForProfile,
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
    });
  }

  reinitialize() {
    const { eventSource } = SillyTavern.getContext();

    // Unregister old listeners
    for (const [eventType, listener] of this.registeredListeners.entries()) {
      // @ts-ignore
      eventSource.removeListener(eventType, listener);
    }
    this.registeredListeners.clear();

    const settings = settingsManager.getSettings();
    const allFlows = settings.flows;
    const eventTriggers: Record<string, { flowId: string; nodeId: string }[]> = {};

    // Find all trigger nodes and group them by event type
    for (const flowId in allFlows) {
      const flow = allFlows[flowId];
      const { isValid, errors } = validateFlow(flow);

      if (!isValid) {
        st_echo('error', `Flow "${flowId}" is invalid and will not be run. Errors:`);
        errors.forEach((error) => st_echo('error', `- ${error}`));
        continue;
      }

      const triggerNodes = flow.nodes.filter((node) => node.type === 'triggerNode');

      for (const triggerNode of triggerNodes) {
        const eventType = triggerNode.data.selectedEventType as string;
        if (eventType) {
          if (!eventTriggers[eventType]) {
            eventTriggers[eventType] = [];
          }
          eventTriggers[eventType].push({ flowId, nodeId: triggerNode.id });
        }
      }
    }

    // Register new event listeners
    for (const eventType in eventTriggers) {
      const listener = (...args: any[]) => {
        st_echo('info', `FlowChart: Event "${eventType}" triggered.`);
        const triggers = eventTriggers[eventType];
        for (const trigger of triggers) {
          this.executeFlowFromEvent(trigger.flowId, trigger.nodeId, args);
        }
      };
      // @ts-ignore
      eventSource.on(eventType, listener);
      this.registeredListeners.set(eventType, listener);
    }
  }

  private async executeFlow(flowId: string, initialInput: Record<string, any>) {
    const settings = settingsManager.getSettings();
    const flow = settings.flows[flowId];
    if (!flow) {
      console.error(`[FlowChart] Flow with id ${flowId} not found.`);
      return;
    }

    eventEmitter.emit('flow:start');
    const report = await this.lowLevelRunner.executeFlow(flow, initialInput);

    if (report.error) {
      st_echo('error', `Flow "${flowId}" failed: ${report.error.message}`);
      eventEmitter.emit('flow:error', report.error);
    }

    executionHistory.unshift({ ...report, flowId, timestamp: new Date() });
    if (executionHistory.length > MAX_HISTORY_LENGTH) {
      executionHistory.pop();
    }
    saveHistory(executionHistory);
    eventEmitter.emit('flow:end', report);

    return report;
  }

  async executeFlowFromEvent(flowId: string, startNodeId: string, eventArgs: any[]) {
    const settings = settingsManager.getSettings();
    const flow = settings.flows[flowId];
    const startNode = flow.nodes.find((n) => n.id === startNodeId);
    if (!startNode) return;

    // Create initial input from event args
    const eventType = startNode.data.selectedEventType as string;
    const paramNames = Object.keys(EventNameParameters[eventType] || {});
    const initialInput: Record<string, any> = {};
    paramNames.forEach((name, index) => {
      initialInput[name] = eventArgs[index];
    });

    return this.executeFlow(flowId, initialInput);
  }

  async runManualTriggers(flowId: string) {
    const settings = settingsManager.getSettings();
    const flow = settings.flows[flowId];
    if (!flow) {
      st_echo('error', `Flow "${flowId}" not found for manual run.`);
      return;
    }

    const manualTriggers = flow.nodes.filter((node) => node.type === 'manualTriggerNode');
    if (manualTriggers.length === 0) {
      st_echo('info', `No Manual Trigger nodes found in flow "${flowId}".`);
      return;
    }

    st_echo('info', `Executing ${manualTriggers.length} manual trigger(s) for flow "${flowId}"...`);
    for (const triggerNode of manualTriggers) {
      let initialInput = {};
      try {
        // @ts-ignore
        initialInput = JSON.parse(triggerNode.data.payload);
      } catch (e) {
        st_echo('error', `Invalid JSON in Manual Trigger node ${triggerNode.id}. Skipping.`);
        continue;
      }
      await this.executeFlow(flowId, initialInput);
    }
  }
}

export const flowRunner = new FlowRunner();

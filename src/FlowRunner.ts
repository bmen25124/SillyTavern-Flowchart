import { settingsManager } from './components/Settings.js';
import { EventNameParameters } from './flow-types.js';
import { sendChatMessage, st_createNewWorldInfo, st_echo } from 'sillytavern-utils-lib/config';
import { validateFlow } from './validator.js';
import { getBaseMessagesForProfile, makeStructuredRequest } from './api.js';
import { ExecutionReport, LowLevelFlowRunner } from './LowLevelFlowRunner.js';
import { createCharacter, saveCharacter, applyWorldInfoEntry, getWorldInfos } from 'sillytavern-utils-lib';
import { FlowData } from './constants.js';
import { SpecFlow } from './flow-spec.js';
import { eventEmitter } from './events.js';
import { st_updateMessageBlock } from './config.js';

export const executionHistory: (ExecutionReport & { flowId: string; timestamp: Date })[] = [];

function convertToSpec(flow: FlowData): SpecFlow {
  return {
    nodes: flow.nodes.map((n) => ({ id: n.id, type: n.type ?? 'unknown', data: n.data })),
    edges: flow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? null,
      target: e.target,
      targetHandle: e.targetHandle ?? null,
    })),
  };
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
    try {
      const specFlow = convertToSpec(flow);
      const report = await this.lowLevelRunner.executeFlow(specFlow, initialInput);

      if (report) {
        executionHistory.unshift({ ...report, flowId, timestamp: new Date() });
        if (executionHistory.length > 50) {
          executionHistory.pop();
        }
        eventEmitter.emit('flow:end', report);
      }
      return report;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      st_echo('error', `Flow "${flowId}" failed: ${errorMessage}`);
      eventEmitter.emit('flow:error', error);
      return undefined;
    }
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

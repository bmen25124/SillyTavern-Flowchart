import { settingsManager } from './components/Settings.js';
import { Node, Edge } from '@xyflow/react';
import { EventNameParameters } from './flow-types.js';
import { FlowData } from './config.js';
import { st_echo } from 'sillytavern-utils-lib/config';
import { validateFlow } from './validator.js';

class FlowRunner {
  private isInitialized = false;

  initialize() {
    if (this.isInitialized) {
      // To prevent duplicate listeners, especially during hot-reloading
      return;
    }
    const settings = settingsManager.getSettings();
    const allFlows = settings.flows;
    const eventTriggers: Record<string, { flowId: string; nodeId: string }[]> = {};

    // Find all starter nodes and group them by event type
    for (const flowId in allFlows) {
      const flow = allFlows[flowId];
      const { isValid, errors } = validateFlow(flow);

      if (!isValid) {
        st_echo('error', `Flow "${flowId}" is invalid and will not be run. Errors:`);
        errors.forEach((error) => st_echo('error', `- ${error}`));
        continue;
      }

      const starterNodes = flow.nodes.filter((node) => node.type === 'starterNode');

      for (const starterNode of starterNodes) {
        const eventType = starterNode.data.selectedEventType as string;
        if (eventType) {
          if (!eventTriggers[eventType]) {
            eventTriggers[eventType] = [];
          }
          eventTriggers[eventType].push({ flowId, nodeId: starterNode.id });
        }
      }
    }

    // Register event listeners
    const { eventSource } = SillyTavern.getContext();
    for (const eventType in eventTriggers) {
      // @ts-ignore
      eventSource.on(eventType, (...args: any[]) => {
        st_echo('info', `FlowChart: Event "${eventType}" triggered.`);
        const triggers = eventTriggers[eventType];
        for (const trigger of triggers) {
          this.executeFlow(trigger.flowId, trigger.nodeId, args);
        }
      });
    }
    this.isInitialized = true;
  }

  executeFlow(flowId: string, startNodeId: string, eventArgs: any[]) {
    console.log(`[FlowChart] Executing flow ${flowId} from node ${startNodeId} with args`, eventArgs);
    const settings = settingsManager.getSettings();
    const flow = settings.flows[flowId];
    if (!flow) {
      console.error(`[FlowChart] Flow with id ${flowId} not found.`);
      return;
    }

    // Create input from event args
    const startNode = flow.nodes.find((n) => n.id === startNodeId);
    if (!startNode) return;
    const eventType = startNode.data.selectedEventType as string;
    const paramNames = Object.keys(EventNameParameters[eventType] || {});
    const input: Record<string, any> = {};
    paramNames.forEach((name, index) => {
      input[name] = eventArgs[index];
    });

    this.executeFromNode(startNodeId, flow, input);
  }

  executeFromNode(nodeId: string, flow: FlowData, input: Record<string, any>) {
    const currentNode = flow.nodes.find((n) => n.id === nodeId);
    if (!currentNode) {
      console.error(`[FlowChart] Node with id ${nodeId} not found in flow.`);
      return;
    }

    console.log(`[FlowChart] Executing node ${currentNode.id} (${currentNode.type})`);

    let nextNodeId: string | null = null;

    switch (currentNode.type) {
      case 'starterNode': {
        const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id);
        if (outgoingEdge) {
          nextNodeId = outgoingEdge.target;
        }
        break;
      }
      case 'ifElseNode': {
        const code = currentNode.data.code as string;
        let result = false;
        try {
          const func = new Function('input', code);
          result = func(input);
        } catch (error) {
          console.error(`[FlowChart] Error executing code in ifElseNode ${currentNode.id}:`, error);
        }

        const handle = result ? 'true' : 'false';
        const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id && e.sourceHandle === handle);
        if (outgoingEdge) {
          nextNodeId = outgoingEdge.target;
        }
        break;
      }
      // Add other node types here
    }

    if (nextNodeId) {
      this.executeFromNode(nextNodeId, flow, input);
    } else {
      console.log(`[FlowChart] Flow execution finished.`);
    }
  }
}

export const flowRunner = new FlowRunner();

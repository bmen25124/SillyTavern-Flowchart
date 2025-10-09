import { settingsManager } from './components/Settings.js';
import { Node, Edge } from '@xyflow/react';
import {
  CreateMessagesNodeDataSchema,
  EventNameParameters,
  IfNodeDataSchema,
  NumberNodeDataSchema,
  SchemaNodeDataSchema,
  StringNodeDataSchema,
  StructuredRequestNodeDataSchema,
  ProfileIdNodeDataSchema,
} from './flow-types.js';
import { z } from 'zod';
import { FlowData } from './config.js';
import { st_echo } from 'sillytavern-utils-lib/config';
import { validateFlow } from './validator.js';
import { getBaseMessagesForProfile, makeStructuredRequest } from './api.js';

class FlowRunner {
  private registeredListeners: Map<string, (...args: any[]) => void> = new Map();

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

    // Register new event listeners
    for (const eventType in eventTriggers) {
      const listener = (...args: any[]) => {
        st_echo('info', `FlowChart: Event "${eventType}" triggered.`);
        const triggers = eventTriggers[eventType];
        for (const trigger of triggers) {
          this.executeFlow(trigger.flowId, trigger.nodeId, args);
        }
      };
      // @ts-ignore
      eventSource.on(eventType, listener);
      this.registeredListeners.set(eventType, listener);
    }
  }

  async executeFlow(flowId: string, startNodeId: string, eventArgs: any[]) {
    console.log(`[FlowChart] Executing flow ${flowId} from node ${startNodeId} with args`, eventArgs);
    const settings = settingsManager.getSettings();
    const flow = settings.flows[flowId];
    if (!flow) {
      console.error(`[FlowChart] Flow with id ${flowId} not found.`);
      return;
    }

    const startNode = flow.nodes.find((n) => n.id === startNodeId);
    if (!startNode) return;

    // Create initial input from event args
    const eventType = startNode.data.selectedEventType as string;
    const paramNames = Object.keys(EventNameParameters[eventType] || {});
    const initialInput: Record<string, any> = {};
    paramNames.forEach((name, index) => {
      initialInput[name] = eventArgs[index];
    });

    // Topological sort to get execution order
    const executionOrder = this.getExecutionOrder(flow);
    const nodeOutputs: Record<string, any> = {};
    const executedNodes = new Set<string>();

    for (const nodeId of executionOrder) {
      const node = flow.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      // For 'if' nodes, we might skip execution based on previous branches
      if (node.type === 'ifNode' && executedNodes.has(nodeId)) {
        continue;
      }

      const inputs = this.getNodeInputs(node, flow.edges, nodeOutputs, initialInput);
      const output = await this.executeNode(node, inputs, flow);

      nodeOutputs[nodeId] = output;
      executedNodes.add(nodeId);

      // Handle control flow for 'if' nodes
      if (node.type === 'ifNode' && output.nextNodeId) {
        // Mark all other branches as "executed" to prevent them from running
        const allIfEdges = flow.edges.filter((e) => e.source === nodeId);
        for (const edge of allIfEdges) {
          if (edge.target !== output.nextNodeId) {
            this.markBranchAsExecuted(edge.target, flow, executedNodes);
          }
        }
      }
    }
    console.log('[FlowChart] Flow execution finished.');
  }

  private markBranchAsExecuted(startNodeId: string, flow: FlowData, executedNodes: Set<string>) {
    const queue = [startNodeId];
    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (!nodeId || executedNodes.has(nodeId)) continue;

      executedNodes.add(nodeId);
      const outgoingEdges = flow.edges.filter((e) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        queue.push(edge.target);
      }
    }
  }

  private getExecutionOrder(flow: FlowData): string[] {
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    flow.nodes.forEach((node) => {
      inDegree[node.id] = 0;
      adj[node.id] = [];
    });

    flow.edges.forEach((edge) => {
      if (adj[edge.source] && inDegree[edge.target] !== undefined) {
        adj[edge.source].push(edge.target);
        inDegree[edge.target]++;
      }
    });

    const queue = flow.nodes.filter((node) => inDegree[node.id] === 0).map((node) => node.id);
    const result: string[] = [];

    while (queue.length > 0) {
      const u = queue.shift()!;
      result.push(u);

      (adj[u] || []).forEach((v) => {
        if (inDegree[v] !== undefined) {
          inDegree[v]--;
          if (inDegree[v] === 0) {
            queue.push(v);
          }
        }
      });
    }
    return result;
  }

  private getNodeInputs(
    node: Node,
    edges: Edge[],
    nodeOutputs: Record<string, any>,
    initialInput: Record<string, any>,
  ): Record<string, any> {
    const inputs: Record<string, any> = { ...initialInput };
    const incomingEdges = edges.filter((edge) => edge.target === node.id);

    for (const edge of incomingEdges) {
      const sourceOutput = nodeOutputs[edge.source];
      const targetHandle = edge.targetHandle;

      if (sourceOutput && targetHandle) {
        // If the source node produced a named output object
        if (typeof sourceOutput === 'object' && sourceOutput !== null && sourceOutput[edge.sourceHandle || 'default']) {
          inputs[targetHandle] = sourceOutput[edge.sourceHandle || 'default'];
        } else {
          // Otherwise, pass the whole output
          inputs[targetHandle] = sourceOutput;
        }
      } else if (sourceOutput) {
        // If no target handle, merge the output
        Object.assign(inputs, sourceOutput);
      }
    }
    return inputs;
  }

  private async executeNode(node: Node, input: Record<string, any>, flow: FlowData): Promise<any> {
    console.log(`[FlowChart] Executing node ${node.id} (${node.type}) with input:`, input);
    let output: any = {};

    switch (node.type) {
      case 'starterNode': {
        output = { ...input };
        break;
      }

      case 'createMessagesNode': {
        const parseResult = CreateMessagesNodeDataSchema.safeParse(node.data);
        if (parseResult.success) {
          const { profileId: staticProfileId, lastMessageId: staticLastMessageId } = parseResult.data;
          const profileId = input.profileId ?? staticProfileId;
          const lastMessageId = input.lastMessageId ?? staticLastMessageId;

          if (profileId) {
            try {
              const messages = await getBaseMessagesForProfile(profileId, lastMessageId);
              output = { messages };
            } catch (error) {
              console.error(`[FlowChart] Error in createMessagesNode ${node.id}:`, error);
            }
          } else {
            console.error(`[FlowChart] Profile ID not found for createMessagesNode ${node.id}.`);
          }
        } else {
          console.error(`[FlowChart] Invalid data for createMessagesNode ${node.id}:`, parseResult.error.issues);
        }
        break;
      }
      case 'ifNode': {
        const parseResult = IfNodeDataSchema.safeParse(node.data);
        if (parseResult.success) {
          const { conditions } = parseResult.data;
          let finalTargetNodeId: string | null = null;

          for (const condition of conditions) {
            let result = false;
            try {
              const stContext = SillyTavern.getContext();
              const func = new Function('input', 'stContext', condition.code);
              result = func(input, stContext);
            } catch (error) {
              console.error(`[FlowChart] Error executing code in ifNode ${node.id}:`, error);
            }

            if (result) {
              const outgoingEdge = flow.edges.find((e) => e.source === node.id && e.sourceHandle === condition.id);
              if (outgoingEdge) {
                finalTargetNodeId = outgoingEdge.target;
                break; // Exit loop on first true condition
              }
            }
          }

          // If no condition was true, check for the 'false' (else) handle
          if (finalTargetNodeId === null) {
            const elseEdge = flow.edges.find((e) => e.source === node.id && e.sourceHandle === 'false');
            if (elseEdge) {
              finalTargetNodeId = elseEdge.target;
            }
          }

          output = { nextNodeId: finalTargetNodeId };
        } else {
          console.error(`[FlowChart] Invalid data for ifNode ${node.id}:`, parseResult.error.issues);
        }
        break;
      }
      case 'stringNode': {
        const parseResult = StringNodeDataSchema.safeParse(node.data);
        if (parseResult.success) {
          output = parseResult.data.value;
        } else {
          console.error(`[FlowChart] Invalid data for stringNode ${node.id}:`, parseResult.error.issues);
        }
        break;
      }
      case 'numberNode': {
        const parseResult = NumberNodeDataSchema.safeParse(node.data);
        if (parseResult.success) {
          output = parseResult.data.value;
        } else {
          console.error(`[FlowChart] Invalid data for numberNode ${node.id}:`, parseResult.error.issues);
        }
        break;
      }
      case 'structuredRequestNode': {
        const parseResult = StructuredRequestNodeDataSchema.safeParse(node.data);
        if (parseResult.success) {
          const {
            profileId: staticProfileId,
            schemaName,
            messageId: staticMessageId,
            promptEngineeringMode,
            maxResponseToken: staticMaxResponseToken,
          } = parseResult.data;

          const profileId = input.profileId ?? staticProfileId;
          const schema = input.schema;
          const messageId = input.messageId ?? staticMessageId;
          const maxResponseToken = input.maxResponseToken ?? staticMaxResponseToken;
          const messages = input.messages;

          if (profileId && schema && messages && messageId !== undefined && maxResponseToken !== undefined) {
            try {
              const result = await makeStructuredRequest(
                profileId,
                messages,
                schema,
                schemaName || 'response',
                messageId,
                promptEngineeringMode as any,
                maxResponseToken,
              );
              output = { structuredResult: result };
            } catch (error) {
              console.error(`[FlowChart] Error in structuredRequestNode ${node.id}:`, error);
            }
          } else {
            console.error(
              `[FlowChart] Missing inputs for structuredRequestNode ${node.id}. Check connections for schema, messages, messageId, and maxResponseToken.`,
            );
          }
        } else {
          console.error(`[FlowChart] Invalid data for structuredRequestNode ${node.id}:`, parseResult.error.issues);
        }
        break;
      }
      case 'schemaNode': {
        const parseResult = SchemaNodeDataSchema.safeParse(node.data);
        if (parseResult.success) {
          const { fields } = parseResult.data;
          const schema = z.object(
            fields.reduce(
              (acc, field) => {
                let zodType;
                switch (field.type) {
                  case 'string':
                    zodType = z.string();
                    break;
                  case 'number':
                    zodType = z.number();
                    break;
                  case 'boolean':
                    zodType = z.boolean();
                    break;
                }
                acc[field.name] = zodType;
                return acc;
              },
              {} as Record<string, z.ZodType<any, any>>,
            ),
          );
          output = schema;
        } else {
          console.error(`[FlowChart] Invalid data for schemaNode ${node.id}:`, parseResult.error.issues);
        }
        break;
      }
      case 'profileIdNode': {
        const parseResult = ProfileIdNodeDataSchema.safeParse(node.data);
        if (parseResult.success) {
          output = parseResult.data.profileId;
        } else {
          console.error(`[FlowChart] Invalid data for profileIdNode ${node.id}:`, parseResult.error.issues);
        }
        break;
      }
    }
    return output;
  }
}

export const flowRunner = new FlowRunner();

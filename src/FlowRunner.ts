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

  async executeFromNode(nodeId: string, flow: FlowData, input: Record<string, any>) {
    const currentNode = flow.nodes.find((n) => n.id === nodeId);
    if (!currentNode) {
      console.error(`[FlowChart] Node with id ${nodeId} not found in flow.`);
      return;
    }

    console.log(`[FlowChart] Executing node ${currentNode.id} (${currentNode.type})`);

    let nextNodeId: string | null = null;
    let nextInput = input;

    switch (currentNode.type) {
      case 'starterNode': {
        const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id);
        if (outgoingEdge) {
          nextNodeId = outgoingEdge.target;
        }
        break;
      }

      case 'createMessagesNode': {
        const parseResult = CreateMessagesNodeDataSchema.safeParse(currentNode.data);
        if (parseResult.success) {
          const { profileId: staticProfileId, lastMessageId: staticLastMessageId } = parseResult.data;
          const profileId = input.profileId ?? staticProfileId;
          const lastMessageId = input.lastMessageId ?? staticLastMessageId;

          if (profileId) {
            try {
              const messages = await getBaseMessagesForProfile(profileId, lastMessageId);
              nextInput = { ...input, messages };
            } catch (error) {
              console.error(`[FlowChart] Error in createMessagesNode ${currentNode.id}:`, error);
            }
          } else {
            console.error(`[FlowChart] Profile ID not found for createMessagesNode ${currentNode.id}.`);
          }
        } else {
          console.error(`[FlowChart] Invalid data for createMessagesNode ${currentNode.id}:`, parseResult.error.issues);
        }

        const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id);
        if (outgoingEdge) {
          nextNodeId = outgoingEdge.target;
        }
        break;
      }
      case 'ifNode': {
        const parseResult = IfNodeDataSchema.safeParse(currentNode.data);
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
              console.error(`[FlowChart] Error executing code in ifNode ${currentNode.id}:`, error);
            }

            if (result) {
              const outgoingEdge = flow.edges.find(
                (e) => e.source === currentNode.id && e.sourceHandle === condition.id,
              );
              if (outgoingEdge) {
                finalTargetNodeId = outgoingEdge.target;
                break; // Exit loop on first true condition
              }
            }
          }

          // If no condition was true, check for the 'false' (else) handle
          if (finalTargetNodeId === null) {
            const elseEdge = flow.edges.find((e) => e.source === currentNode.id && e.sourceHandle === 'false');
            if (elseEdge) {
              finalTargetNodeId = elseEdge.target;
            }
          }

          if (finalTargetNodeId) {
            nextNodeId = finalTargetNodeId;
          }
        } else {
          console.error(`[FlowChart] Invalid data for ifNode ${currentNode.id}:`, parseResult.error.issues);
        }
        break;
      }
      case 'stringNode': {
        const parseResult = StringNodeDataSchema.safeParse(currentNode.data);
        if (parseResult.success) {
          const { value } = parseResult.data;
          const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id);
          if (outgoingEdge?.targetHandle) {
            nextInput = { ...input, [outgoingEdge.targetHandle]: value };
          }
        } else {
          console.error(`[FlowChart] Invalid data for stringNode ${currentNode.id}:`, parseResult.error.issues);
        }
        const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id);
        if (outgoingEdge) {
          nextNodeId = outgoingEdge.target;
        }
        break;
      }
      case 'numberNode': {
        const parseResult = NumberNodeDataSchema.safeParse(currentNode.data);
        if (parseResult.success) {
          const { value } = parseResult.data;
          const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id);
          if (outgoingEdge?.targetHandle) {
            nextInput = { ...input, [outgoingEdge.targetHandle]: value };
          }
        } else {
          console.error(`[FlowChart] Invalid data for numberNode ${currentNode.id}:`, parseResult.error.issues);
        }
        const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id);
        if (outgoingEdge) {
          nextNodeId = outgoingEdge.target;
        }
        break;
      }
      // Add other node types here
      case 'structuredRequestNode': {
        const parseResult = StructuredRequestNodeDataSchema.safeParse(currentNode.data);
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
              const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id);
              if (outgoingEdge?.targetHandle) {
                nextInput = { ...input, [outgoingEdge.targetHandle]: result };
              } else {
                nextInput = { ...input, structuredResult: result };
              }
            } catch (error) {
              console.error(`[FlowChart] Error in structuredRequestNode ${currentNode.id}:`, error);
            }
          } else {
            console.error(
              `[FlowChart] Missing inputs for structuredRequestNode ${currentNode.id}. Check connections for schema, messages, messageId, and maxResponseToken.`,
            );
          }
        } else {
          console.error(
            `[FlowChart] Invalid data for structuredRequestNode ${currentNode.id}:`,
            parseResult.error.issues,
          );
        }
        const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id);
        if (outgoingEdge) {
          nextNodeId = outgoingEdge.target;
        }
        break;
      }
      case 'schemaNode': {
        const parseResult = SchemaNodeDataSchema.safeParse(currentNode.data);
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

          const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id);
          if (outgoingEdge?.targetHandle) {
            nextInput = { ...input, [outgoingEdge.targetHandle]: schema };
          }
        } else {
          console.error(`[FlowChart] Invalid data for schemaNode ${currentNode.id}:`, parseResult.error.issues);
        }
        const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id);
        if (outgoingEdge) {
          nextNodeId = outgoingEdge.target;
        }
        break;
      }
      case 'profileIdNode': {
        const parseResult = ProfileIdNodeDataSchema.safeParse(currentNode.data);
        if (parseResult.success) {
          const { profileId } = parseResult.data;
          const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id);
          if (outgoingEdge?.targetHandle) {
            nextInput = { ...input, [outgoingEdge.targetHandle]: profileId };
          }
        } else {
          console.error(`[FlowChart] Invalid data for profileIdNode ${currentNode.id}:`, parseResult.error.issues);
        }
        const outgoingEdge = flow.edges.find((e) => e.source === currentNode.id);
        if (outgoingEdge) {
          nextNodeId = outgoingEdge.target;
        }
        break;
      }
    }

    if (nextNodeId) {
      this.executeFromNode(nextNodeId, flow, nextInput);
    } else {
      console.log(`[FlowChart] Flow execution finished.`);
    }
  }
}

export const flowRunner = new FlowRunner();

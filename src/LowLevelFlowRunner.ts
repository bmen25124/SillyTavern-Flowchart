import { Node, Edge } from '@xyflow/react';
import {
  CreateMessagesNodeDataSchema,
  CustomMessageNodeDataSchema,
  IfNodeDataSchema,
  MergeMessagesNodeDataSchema,
  NumberNodeDataSchema,
  ProfileIdNodeDataSchema,
  SchemaNodeDataSchema,
  StringNodeDataSchema,
  StructuredRequestNodeDataSchema,
  SchemaTypeDefinition,
  CreateCharacterNodeDataSchema,
  EditCharacterNodeDataSchema,
} from './flow-types.js';
import { z } from 'zod';
import { FlowData } from './constants.js';
import { validateFlow } from './validator.js';
import { FullExportData, Character } from 'sillytavern-utils-lib/types';

export interface ExecutionReport {
  executedNodes: {
    nodeId: string;
    type: string | undefined;
    input: Record<string, any>;
    output: any;
  }[];
}

export interface FlowRunnerDependencies {
  getBaseMessagesForProfile: (profileId: string, lastMessageId?: number) => Promise<any[]>;
  makeStructuredRequest: (
    profileId: string,
    messages: any[],
    schema: z.ZodObject<any>,
    schemaName: string,
    messageId: number,
    promptEngineeringMode: any,
    maxResponseToken: number,
  ) => Promise<any>;
  getSillyTavernContext: () => any;
  createCharacter: (data: FullExportData) => Promise<void>;
  saveCharacter: (data: Character) => Promise<void>;
}

function buildZodSchema(definition: SchemaTypeDefinition): z.ZodTypeAny {
  let zodType: z.ZodTypeAny;

  switch (definition.type) {
    case 'string':
      zodType = z.string();
      break;
    case 'number':
      zodType = z.number();
      break;
    case 'boolean':
      zodType = z.boolean();
      break;
    case 'enum':
      if (!definition.values || definition.values.length === 0) {
        zodType = z.string();
      } else {
        zodType = z.enum(definition.values as [string, ...string[]]);
      }
      break;
    case 'object':
      const shape: Record<string, z.ZodTypeAny> = {};
      if (definition.fields) {
        for (const field of definition.fields) {
          shape[field.name] = buildZodSchema(field);
        }
      }
      zodType = z.object(shape);
      break;
    case 'array':
      if (definition.items) {
        zodType = z.array(buildZodSchema(definition.items));
      } else {
        zodType = z.array(z.any());
      }
      break;
    default:
      zodType = z.any();
  }

  if (definition.description) {
    return zodType.describe(definition.description);
  }
  return zodType;
}

export class LowLevelFlowRunner {
  constructor(private dependencies: FlowRunnerDependencies) {}

  public async executeFlow(flow: FlowData, initialInput: Record<string, any>): Promise<ExecutionReport> {
    const { isValid, errors } = validateFlow(flow);

    if (!isValid) {
      throw new Error(errors.join('\n'));
    }

    console.log(`[FlowChart] Executing flow with args`, initialInput);

    const executionOrder = this.getExecutionOrder(flow);
    const nodeOutputs: Record<string, any> = {};
    const executedNodes = new Set<string>();
    const report: ExecutionReport = { executedNodes: [] };

    for (const nodeId of executionOrder) {
      const node = flow.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      if (executedNodes.has(nodeId)) {
        continue;
      }

      const inputs = this.getNodeInputs(node, flow.edges, nodeOutputs, initialInput);
      const output = await this.executeNode(node, inputs, flow);

      nodeOutputs[nodeId] = output;
      executedNodes.add(nodeId);
      report.executedNodes.push({ nodeId: node.id, type: node.type, input: inputs, output: output });

      if (node.type === 'ifNode' && output.nextNodeId) {
        const allIfEdges = flow.edges.filter((e) => e.source === nodeId);
        for (const edge of allIfEdges) {
          if (edge.target !== output.nextNodeId) {
            this.markBranchAsExecuted(edge.target, flow, executedNodes);
          }
        }
      }
    }
    console.log('[FlowChart] Flow execution finished.');
    return report;
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
        const handle = edge.sourceHandle;
        if (handle && typeof sourceOutput === 'object' && sourceOutput !== null && sourceOutput[handle] !== undefined) {
          inputs[targetHandle] = sourceOutput[handle];
        } else {
          inputs[targetHandle] = sourceOutput;
        }
      } else if (sourceOutput) {
        if (typeof sourceOutput === 'object' && sourceOutput !== null) {
          Object.assign(inputs, sourceOutput);
        }
      }
    }
    return inputs;
  }

  private async executeNode(node: Node, input: Record<string, any>, flow: FlowData): Promise<any> {
    console.log(`[FlowChart] Executing node ${node.id} (${node.type}) with input:`, input);
    let output: any = {};

    switch (node.type) {
      case 'triggerNode': {
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
              const messages = await this.dependencies.getBaseMessagesForProfile(profileId, lastMessageId);
              output = messages;
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
      case 'customMessageNode': {
        const parseResult = CustomMessageNodeDataSchema.safeParse(node.data);
        if (parseResult.success) {
          output = parseResult.data.messages.map(({ role, content }) => ({ role, content }));
        } else {
          console.error(`[FlowChart] Invalid data for customMessageNode ${node.id}:`, parseResult.error.issues);
        }
        break;
      }
      case 'mergeMessagesNode': {
        const parseResult = MergeMessagesNodeDataSchema.safeParse(node.data);
        if (parseResult.success) {
          const allMessages = [];
          const messageKeys = Object.keys(input)
            .filter((key) => key.startsWith('messages_') && Array.isArray(input[key]))
            .sort((a, b) => {
              const numA = parseInt(a.split('_')[1], 10);
              const numB = parseInt(b.split('_')[1], 10);
              return numA - numB;
            });

          for (const key of messageKeys) {
            allMessages.push(...input[key]);
          }
          output = allMessages;
        } else {
          console.error(`[FlowChart] Invalid data for mergeMessagesNode ${node.id}:`, parseResult.error.issues);
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
              const stContext = this.dependencies.getSillyTavernContext();
              const func = new Function('input', 'stContext', condition.code);
              result = func(input, stContext);
            } catch (error) {
              console.error(`[FlowChart] Error executing code in ifNode ${node.id}:`, error);
            }

            if (result) {
              const outgoingEdge = flow.edges.find((e) => e.source === node.id && e.sourceHandle === condition.id);
              if (outgoingEdge) {
                finalTargetNodeId = outgoingEdge.target;
                break;
              }
            }
          }

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
              const result = await this.dependencies.makeStructuredRequest(
                profileId,
                messages,
                schema,
                schemaName || 'response',
                messageId,
                promptEngineeringMode as any,
                maxResponseToken,
              );
              output = result;
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
          const topLevelObjectDefinition: SchemaTypeDefinition = {
            type: 'object',
            fields: fields,
          };
          output = buildZodSchema(topLevelObjectDefinition);
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
      case 'createCharacterNode': {
        const parseResult = CreateCharacterNodeDataSchema.safeParse(node.data);
        if (!parseResult.success) {
          console.error(`[FlowChart] Invalid data for createCharacterNode ${node.id}:`, parseResult.error.issues);
          break;
        }
        const staticData = parseResult.data;
        const name = input.name ?? staticData.name;
        if (!name) {
          console.error(`[FlowChart] Character name is required for createCharacterNode ${node.id}.`);
          break;
        }

        const description = input.description ?? staticData.description ?? '';
        const first_mes = input.first_mes ?? staticData.first_mes ?? '';
        const scenario = input.scenario ?? staticData.scenario ?? '';
        const personality = input.personality ?? staticData.personality ?? '';
        const mes_example = input.mes_example ?? staticData.mes_example ?? '';
        const tagsStr = input.tags ?? staticData.tags ?? '';
        const tags = tagsStr
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean);

        const charData: FullExportData = {
          name,
          description,
          first_mes,
          scenario,
          personality,
          mes_example,
          tags,
          avatar: 'none',
          spec: 'chara_card_v3',
          spec_version: '3.0',
          data: {
            name,
            description,
            first_mes,
            scenario,
            personality,
            mes_example,
            tags,
            avatar: 'none',
          },
        };

        try {
          await this.dependencies.createCharacter(charData);
          output = name;
        } catch (error) {
          console.error(`[FlowChart] Error in createCharacterNode ${node.id}:`, error);
        }
        break;
      }
      case 'editCharacterNode': {
        const parseResult = EditCharacterNodeDataSchema.safeParse(node.data);
        if (!parseResult.success) {
          console.error(`[FlowChart] Invalid data for editCharacterNode ${node.id}:`, parseResult.error.issues);
          break;
        }
        const staticData = parseResult.data;
        const characterAvatar = input.characterAvatar ?? staticData.characterAvatar;
        if (!characterAvatar) {
          console.error(`[FlowChart] Character to edit is required for editCharacterNode ${node.id}.`);
          break;
        }

        const stContext = this.dependencies.getSillyTavernContext();
        const existingChar = stContext.characters.find((c: Character) => c.avatar === characterAvatar);
        if (!existingChar) {
          console.error(`[FlowChart] Character with avatar "${characterAvatar}" not found for editing.`);
          break;
        }

        const updatedChar: Character = { ...existingChar };

        const name = input.name ?? staticData.name;
        if (name !== undefined) updatedChar.name = name;

        const description = input.description ?? staticData.description;
        if (description !== undefined) updatedChar.description = description;

        const first_mes = input.first_mes ?? staticData.first_mes;
        if (first_mes !== undefined) updatedChar.first_mes = first_mes;

        const scenario = input.scenario ?? staticData.scenario;
        if (scenario !== undefined) updatedChar.scenario = scenario;

        const personality = input.personality ?? staticData.personality;
        if (personality !== undefined) updatedChar.personality = personality;

        const mes_example = input.mes_example ?? staticData.mes_example;
        if (mes_example !== undefined) updatedChar.mes_example = mes_example;

        const tagsStr = input.tags ?? staticData.tags;
        if (tagsStr !== undefined) {
          updatedChar.tags = tagsStr
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean);
        }

        try {
          await this.dependencies.saveCharacter(updatedChar);
          output = updatedChar.name;
        } catch (error) {
          console.error(`[FlowChart] Error in editCharacterNode ${node.id}:`, error);
        }
        break;
      }
    }
    return output;
  }
}

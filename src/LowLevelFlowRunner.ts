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
  ManualTriggerNodeDataSchema,
  GetCharacterNodeDataSchema,
  HandlebarNodeDataSchema,
  JsonNodeData,
  MergeObjectsNodeDataSchema,
  JsonNodeItem,
} from './flow-types.js';
import { z } from 'zod';
import { FlowData } from './constants.js';
import { validateFlow } from './validator.js';
import { FullExportData, Character } from 'sillytavern-utils-lib/types';
import Handlebars from 'handlebars';

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

type NodeExecutor = (node: Node, input: Record<string, any>, flow: FlowData) => Promise<any>;

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
  private nodeExecutors: Record<string, NodeExecutor>;

  constructor(private dependencies: FlowRunnerDependencies) {
    this.nodeExecutors = {
      triggerNode: this.executeTriggerNode.bind(this),
      manualTriggerNode: this.executeManualTriggerNode.bind(this),
      createMessagesNode: this.executeCreateMessagesNode.bind(this),
      customMessageNode: this.executeCustomMessageNode.bind(this),
      mergeMessagesNode: this.executeMergeMessagesNode.bind(this),
      mergeObjectsNode: this.executeMergeObjectsNode.bind(this),
      ifNode: this.executeIfNode.bind(this),
      stringNode: this.executeStringNode.bind(this),
      numberNode: this.executeNumberNode.bind(this),
      jsonNode: this.executeJsonNode.bind(this),
      handlebarNode: this.executeHandlebarNode.bind(this),
      getCharacterNode: this.executeGetCharacterNode.bind(this),
      structuredRequestNode: this.executeStructuredRequestNode.bind(this),
      schemaNode: this.executeSchemaNode.bind(this),
      profileIdNode: this.executeProfileIdNode.bind(this),
      createCharacterNode: this.executeCreateCharacterNode.bind(this),
      editCharacterNode: this.executeEditCharacterNode.bind(this),
    };
  }

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

      const isRootNode = !flow.edges.some((e) => e.target === nodeId);
      const baseInput = isRootNode ? initialInput : {};
      const inputs = this.getNodeInputs(node, flow.edges, nodeOutputs, baseInput);
      const output = await this.executeNode(node, inputs, flow);

      nodeOutputs[nodeId] = output;
      executedNodes.add(nodeId);
      report.executedNodes.push({ nodeId: node.id, type: node.type, input: inputs, output: output });

      if (node.type === 'ifNode' && output.nextNodeId) {
        // An if-node is for control flow only. It provides no data itself.
        // Its output is set to an empty object to prevent its input context
        // from polluting the inputs of nodes within its branches.
        nodeOutputs[nodeId] = {};

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
    baseInput: Record<string, any>,
  ): Record<string, any> {
    const inputs: Record<string, any> = { ...baseInput };
    const incomingEdges = edges.filter((edge) => edge.target === node.id);

    for (const edge of incomingEdges) {
      const sourceOutput = nodeOutputs[edge.source];
      if (sourceOutput === undefined) continue;

      const targetHandle = edge.targetHandle;
      if (targetHandle) {
        const sourceHandle = edge.sourceHandle;
        if (
          sourceHandle &&
          typeof sourceOutput === 'object' &&
          sourceOutput !== null &&
          sourceOutput[sourceHandle] !== undefined
        ) {
          inputs[targetHandle] = sourceOutput[sourceHandle];
        } else {
          inputs[targetHandle] = sourceOutput;
        }
      } else {
        // No target handle: Distinguish between context-passing (objects) and value-passing (primitives).
        if (typeof sourceOutput === 'object' && sourceOutput !== null && !Array.isArray(sourceOutput)) {
          Object.assign(inputs, sourceOutput);
        } else {
          inputs.value = sourceOutput;
        }
      }
    }
    return inputs;
  }

  private async executeNode(node: Node, input: Record<string, any>, flow: FlowData): Promise<any> {
    const executor = this.nodeExecutors[node.type as string];
    if (executor) {
      console.log(`[FlowChart] Executing node ${node.id} (${node.type}) with input:`, input);
      try {
        return await executor(node, input, flow);
      } catch (error) {
        console.error(`[FlowChart] Error executing node ${node.id} (${node.type}):`, error);
        return {};
      }
    }
    return {};
  }

  private async executeTriggerNode(_node: Node, input: Record<string, any>): Promise<any> {
    return { ...input };
  }

  private async executeManualTriggerNode(node: Node): Promise<any> {
    const parseResult = ManualTriggerNodeDataSchema.safeParse(node.data);
    if (parseResult.success) {
      try {
        return JSON.parse(parseResult.data.payload);
      } catch (e) {
        console.error(`[FlowChart] Invalid JSON payload for manualTriggerNode ${node.id}:`, e);
      }
    }
    return {};
  }

  private async executeCreateMessagesNode(node: Node, input: Record<string, any>): Promise<any> {
    const parseResult = CreateMessagesNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      console.error(`[FlowChart] Invalid data for createMessagesNode ${node.id}:`, parseResult.error.issues);
      return [];
    }

    const { profileId: staticProfileId, lastMessageId: staticLastMessageId } = parseResult.data;
    const profileId = input.profileId ?? staticProfileId;
    const lastMessageId = input.lastMessageId ?? staticLastMessageId;

    if (profileId) {
      return this.dependencies.getBaseMessagesForProfile(profileId, lastMessageId);
    }
    console.error(`[FlowChart] Profile ID not found for createMessagesNode ${node.id}.`);
    return [];
  }

  private async executeCustomMessageNode(node: Node, input: Record<string, any>): Promise<any> {
    const parseResult = CustomMessageNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      console.error(`[FlowChart] Invalid data for customMessageNode ${node.id}:`, parseResult.error.issues);
      return [];
    }
    return parseResult.data.messages.map(({ id, role, content }) => ({
      role,
      content: input[id] ?? content,
    }));
  }

  private async executeMergeMessagesNode(node: Node, input: Record<string, any>): Promise<any> {
    const parseResult = MergeMessagesNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      console.error(`[FlowChart] Invalid data for mergeMessagesNode ${node.id}:`, parseResult.error.issues);
      return [];
    }

    return Object.keys(input)
      .filter((key) => key.startsWith('messages_') && Array.isArray(input[key]))
      .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10))
      .flatMap((key) => input[key]);
  }

  private async executeMergeObjectsNode(node: Node, input: Record<string, any>): Promise<any> {
    const parseResult = MergeObjectsNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      console.error(`[FlowChart] Invalid data for mergeObjectsNode ${node.id}:`, parseResult.error.issues);
      return {};
    }

    const objectsToMerge = Object.keys(input)
      .filter((key) => key.startsWith('object_') && typeof input[key] === 'object' && input[key] !== null)
      .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10))
      .map((key) => input[key]);

    return Object.assign({}, ...objectsToMerge);
  }

  private async executeIfNode(node: Node, input: Record<string, any>, flow: FlowData): Promise<any> {
    const parseResult = IfNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      console.error(`[FlowChart] Invalid data for ifNode ${node.id}:`, parseResult.error.issues);
      return {};
    }

    for (const condition of parseResult.data.conditions) {
      try {
        const func = new Function('input', 'stContext', condition.code);
        if (func(input, this.dependencies.getSillyTavernContext())) {
          const edge = flow.edges.find((e) => e.source === node.id && e.sourceHandle === condition.id);
          return { nextNodeId: edge?.target ?? null };
        }
      } catch (error) {
        console.error(`[FlowChart] Error executing code in ifNode ${node.id}:`, error);
      }
    }

    const elseEdge = flow.edges.find((e) => e.source === node.id && e.sourceHandle === 'false');
    return { nextNodeId: elseEdge?.target ?? null };
  }

  private async executeStringNode(node: Node, input: Record<string, any>): Promise<any> {
    const parseResult = StringNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      console.error(`[FlowChart] Invalid data for stringNode ${node.id}:`, parseResult.error.issues);
      return '';
    }
    return input.value !== undefined ? String(input.value) : parseResult.data.value;
  }

  private async executeNumberNode(node: Node, input: Record<string, any>): Promise<any> {
    const parseResult = NumberNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      console.error(`[FlowChart] Invalid data for numberNode ${node.id}:`, parseResult.error.issues);
      return 0;
    }
    return input.value !== undefined ? Number(input.value) : parseResult.data.value;
  }

  private async executeJsonNode(node: Node): Promise<any> {
    const data = node.data as JsonNodeData;
    const buildObject = (items: JsonNodeItem[]): object => {
      const obj: { [key: string]: any } = {};
      for (const item of items) {
        if (item.type === 'object') {
          obj[item.key] = buildObject(item.value as JsonNodeItem[]);
        } else if (item.type === 'array') {
          obj[item.key] = (item.value as JsonNodeItem[]).map((child) =>
            child.type === 'object' ? buildObject(child.value as JsonNodeItem[]) : child.value,
          );
        } else {
          obj[item.key] = item.value;
        }
      }
      return obj;
    };
    return buildObject(data.items);
  }

  private async executeHandlebarNode(node: Node, input: Record<string, any>): Promise<any> {
    const parseResult = HandlebarNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) return { result: '' };

    const template = input.template ?? parseResult.data.template;
    const data = input.data ?? {};
    try {
      const compiled = Handlebars.compile(template, { noEscape: true });
      return { result: compiled(data) };
    } catch (e: any) {
      console.error(`[FlowChart] Error executing handlebar template in ${node.id}:`, e);
      return { result: '' };
    }
  }

  private async executeGetCharacterNode(node: Node, input: Record<string, any>): Promise<any> {
    const parseResult = GetCharacterNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) return {};

    const characterAvatar = input.characterAvatar ?? parseResult.data.characterAvatar;
    if (characterAvatar) {
      const stContext = this.dependencies.getSillyTavernContext();
      const character = stContext.characters.find((c: Character) => c.avatar === characterAvatar);
      if (character) {
        return { ...character, result: character };
      }
      console.error(`[FlowChart] Character with avatar ${characterAvatar} not found.`);
    } else {
      console.error(`[FlowChart] No character avatar provided to getCharacterNode ${node.id}.`);
    }
    return {};
  }

  private async executeStructuredRequestNode(node: Node, input: Record<string, any>): Promise<any> {
    const parseResult = StructuredRequestNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) return {};

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
      const result = await this.dependencies.makeStructuredRequest(
        profileId,
        messages,
        schema,
        schemaName || 'response',
        messageId,
        promptEngineeringMode as any,
        maxResponseToken,
      );
      return { ...result, result };
    } else {
      console.error(
        `[FlowChart] Missing inputs for structuredRequestNode ${node.id}. Check connections for schema, messages, messageId, and maxResponseToken.`,
      );
      return {};
    }
  }

  private async executeSchemaNode(node: Node): Promise<any> {
    const parseResult = SchemaNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) return {};
    const topLevelObjectDefinition: SchemaTypeDefinition = { type: 'object', fields: parseResult.data.fields };
    return buildZodSchema(topLevelObjectDefinition);
  }

  private async executeProfileIdNode(node: Node): Promise<any> {
    const parseResult = ProfileIdNodeDataSchema.safeParse(node.data);
    return parseResult.success ? parseResult.data.profileId : '';
  }

  private async executeCreateCharacterNode(node: Node, input: Record<string, any>): Promise<any> {
    const parseResult = CreateCharacterNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) return '';
    const staticData = parseResult.data;

    const name = input.name ?? staticData.name;
    if (!name) {
      console.error(`[FlowChart] Character name is required for createCharacterNode ${node.id}.`);
      return '';
    }

    const tagsStr = input.tags ?? staticData.tags ?? '';
    const charData: FullExportData = {
      name,
      description: input.description ?? staticData.description ?? '',
      first_mes: input.first_mes ?? staticData.first_mes ?? '',
      scenario: input.scenario ?? staticData.scenario ?? '',
      personality: input.personality ?? staticData.personality ?? '',
      mes_example: input.mes_example ?? staticData.mes_example ?? '',
      tags: tagsStr
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean),
      avatar: 'none',
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        name,
        description: '',
        first_mes: '',
        scenario: '',
        personality: '',
        mes_example: '',
        tags: [],
        avatar: 'none',
      },
    };

    await this.dependencies.createCharacter(charData);
    return name;
  }

  private async executeEditCharacterNode(node: Node, input: Record<string, any>): Promise<any> {
    const parseResult = EditCharacterNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) return '';
    const staticData = parseResult.data;

    const characterAvatar = input.characterAvatar ?? staticData.characterAvatar;
    if (!characterAvatar) {
      console.error(`[FlowChart] Character avatar is required for editCharacterNode ${node.id}.`);
      return '';
    }

    const stContext = this.dependencies.getSillyTavernContext();
    const existingChar = stContext.characters.find((c: Character) => c.avatar === characterAvatar);
    if (!existingChar) {
      console.error(`[FlowChart] Character with avatar "${characterAvatar}" not found.`);
      return '';
    }

    const updatedChar: Character = { ...existingChar };
    const fields: (keyof typeof staticData)[] = [
      'name',
      'description',
      'first_mes',
      'scenario',
      'personality',
      'mes_example',
    ];

    fields.forEach((field) => {
      const value = input[field] ?? staticData[field];
      if (value !== undefined) {
        // @ts-ignore
        updatedChar[field] = value;
      }
    });

    const tagsStr = input.tags ?? staticData.tags;
    if (tagsStr !== undefined) {
      updatedChar.tags = tagsStr
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);
    }

    await this.dependencies.saveCharacter(updatedChar);
    return updatedChar.name;
  }
}

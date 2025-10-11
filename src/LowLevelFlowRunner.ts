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
  LogNodeDataSchema,
  CreateLorebookNodeDataSchema,
  CreateLorebookEntryNodeDataSchema,
  EditLorebookEntryNodeDataSchema,
} from './flow-types.js';
import { z } from 'zod';
import { FullExportData, Character } from 'sillytavern-utils-lib/types';
import Handlebars from 'handlebars';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import { SpecEdge, SpecFlow, SpecNode } from './flow-spec.js';
import { eventEmitter } from './events.js';

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
    promptEngineeringMode: any,
    maxResponseToken: number,
  ) => Promise<any>;
  getSillyTavernContext: () => any;
  createCharacter: (data: FullExportData) => Promise<void>;
  saveCharacter: (data: Character) => Promise<void>;
  st_createNewWorldInfo: (worldName: string) => Promise<boolean>;
  applyWorldInfoEntry: (options: {
    entry: WIEntry;
    selectedWorldName: string;
    operation?: 'add' | 'update' | 'auto';
  }) => Promise<{ entry: WIEntry; operation: 'add' | 'update' }>;
  getWorldInfo: (
    include: ('all' | 'global' | 'character' | 'chat' | 'persona')[],
  ) => Promise<Record<string, WIEntry[]>>;
}

type NodeExecutor = (node: SpecNode, input: Record<string, any>, flow: SpecFlow) => Promise<any>;

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
      logNode: this.executeLogNode.bind(this),
      jsonNode: this.executeJsonNode.bind(this),
      handlebarNode: this.executeHandlebarNode.bind(this),
      getCharacterNode: this.executeGetCharacterNode.bind(this),
      structuredRequestNode: this.executeStructuredRequestNode.bind(this),
      schemaNode: this.executeSchemaNode.bind(this),
      profileIdNode: this.executeProfileIdNode.bind(this),
      createCharacterNode: this.executeCreateCharacterNode.bind(this),
      editCharacterNode: this.executeEditCharacterNode.bind(this),
      createLorebookNode: this.executeCreateLorebookNode.bind(this),
      createLorebookEntryNode: this.executeCreateLorebookEntryNode.bind(this),
      editLorebookEntryNode: this.executeEditLorebookEntryNode.bind(this),
    };
  }

  public async executeFlow(flow: SpecFlow, initialInput: Record<string, any>): Promise<ExecutionReport> {
    console.log(`[FlowChart] Executing flow with args`, initialInput);

    const executionOrder = this.getExecutionOrder(flow);
    const nodeOutputs: Record<string, any> = {};
    const executedNodes = new Set<string>();
    const report: ExecutionReport = { executedNodes: [] };

    try {
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
        const nodeReport = { nodeId: node.id, type: node.type, input: inputs, output: output };
        report.executedNodes.push(nodeReport);
        eventEmitter.emit('node:end', nodeReport);

        if (node.type === 'ifNode' && output.nextNodeId) {
          // An if-node is for control flow only. It provides no data itself.
          nodeOutputs[nodeId] = {};

          const allIfEdges = flow.edges.filter((e) => e.source === nodeId);
          for (const edge of allIfEdges) {
            if (edge.target !== output.nextNodeId) {
              this.markBranchAsExecuted(edge.target, flow, executedNodes);
            }
          }
        }
      }
    } catch (error) {
      console.error('[FlowChart] Flow execution aborted due to an error.', error);
      throw error;
    }

    console.log('[FlowChart] Flow execution finished.');
    return report;
  }

  private markBranchAsExecuted(startNodeId: string, flow: SpecFlow, executedNodes: Set<string>) {
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

  private getExecutionOrder(flow: SpecFlow): string[] {
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
    node: SpecNode,
    edges: SpecEdge[],
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

  private async executeNode(node: SpecNode, input: Record<string, any>, flow: SpecFlow): Promise<any> {
    if (node.type === 'groupNode') return {};

    const executor = this.nodeExecutors[node.type];
    if (executor) {
      console.log(`[FlowChart] Executing node ${node.id} (${node.type}) with input:`, input);
      eventEmitter.emit('node:start', node.id);
      try {
        const result = await executor(node, input, flow);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Execution failed at node ${node.id} (${node.type}): ${errorMessage}`);
      }
    }
    return {};
  }

  private async executeTriggerNode(_node: SpecNode, input: Record<string, any>): Promise<any> {
    return { ...input };
  }

  private async executeManualTriggerNode(node: SpecNode): Promise<any> {
    const parseResult = ManualTriggerNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    try {
      return JSON.parse(parseResult.data.payload);
    } catch (e: any) {
      throw new Error(`Invalid JSON payload: ${e.message}`);
    }
  }

  private async executeCreateMessagesNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = CreateMessagesNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }

    const { profileId: staticProfileId, lastMessageId: staticLastMessageId } = parseResult.data;
    const profileId = input.profileId ?? staticProfileId;
    const lastMessageId = input.lastMessageId ?? staticLastMessageId;

    if (!profileId) {
      throw new Error(`Profile ID not provided.`);
    }
    return this.dependencies.getBaseMessagesForProfile(profileId, lastMessageId);
  }

  private async executeCustomMessageNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = CustomMessageNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    return parseResult.data.messages.map(({ id, role, content }) => ({
      role,
      content: input[id] ?? content,
    }));
  }

  private async executeMergeMessagesNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = MergeMessagesNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }

    return Object.keys(input)
      .filter((key) => key.startsWith('messages_') && Array.isArray(input[key]))
      .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10))
      .flatMap((key) => input[key]);
  }

  private async executeMergeObjectsNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = MergeObjectsNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }

    const objectsToMerge = Object.keys(input)
      .filter((key) => key.startsWith('object_') && typeof input[key] === 'object' && input[key] !== null)
      .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10))
      .map((key) => input[key]);

    return Object.assign({}, ...objectsToMerge);
  }

  private async executeIfNode(node: SpecNode, input: Record<string, any>, flow: SpecFlow): Promise<any> {
    const parseResult = IfNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }

    for (const condition of parseResult.data.conditions) {
      try {
        const func = new Function('input', 'stContext', condition.code);
        if (func(input, this.dependencies.getSillyTavernContext())) {
          const edge = flow.edges.find((e) => e.source === node.id && e.sourceHandle === condition.id);
          return { nextNodeId: edge?.target ?? null };
        }
      } catch (error: any) {
        throw new Error(`Error executing condition code: ${error.message}`);
      }
    }

    const elseEdge = flow.edges.find((e) => e.source === node.id && e.sourceHandle === 'false');
    return { nextNodeId: elseEdge?.target ?? null };
  }

  private async executeStringNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = StringNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    return input.value !== undefined ? String(input.value) : parseResult.data.value;
  }

  private async executeNumberNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = NumberNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    return input.value !== undefined ? Number(input.value) : parseResult.data.value;
  }

  private async executeLogNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = LogNodeDataSchema.safeParse(node.data);
    const prefix = parseResult.success ? parseResult.data.prefix : '[LogNode]';
    console.log(prefix, input);
    return input;
  }

  private async executeJsonNode(node: SpecNode): Promise<any> {
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

  private async executeHandlebarNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = HandlebarNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }

    const template = input.template ?? parseResult.data.template;
    const data = input.data ?? {};
    try {
      const compiled = Handlebars.compile(template, { noEscape: true });
      return { result: compiled(data) };
    } catch (e: any) {
      throw new Error(`Error executing handlebar template: ${e.message}`);
    }
  }

  private async executeGetCharacterNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = GetCharacterNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }

    const characterAvatar = input.characterAvatar ?? parseResult.data.characterAvatar;
    if (!characterAvatar) {
      throw new Error('No character avatar provided.');
    }

    const stContext = this.dependencies.getSillyTavernContext();
    const character = stContext.characters.find((c: Character) => c.avatar === characterAvatar);
    if (!character) {
      throw new Error(`Character with avatar ${characterAvatar} not found.`);
    }
    return { ...character, result: character };
  }

  private async executeStructuredRequestNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = StructuredRequestNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }

    const {
      profileId: staticProfileId,
      schemaName,
      promptEngineeringMode,
      maxResponseToken: staticMaxResponseToken,
    } = parseResult.data;

    const profileId = input.profileId ?? staticProfileId;
    const schema = input.schema;
    const maxResponseToken = input.maxResponseToken ?? staticMaxResponseToken;
    const messages = input.messages;

    if (profileId && schema && messages && maxResponseToken !== undefined) {
      const result = await this.dependencies.makeStructuredRequest(
        profileId,
        messages,
        schema,
        schemaName || 'response',
        promptEngineeringMode as any,
        maxResponseToken,
      );
      return { ...result, result };
    } else {
      throw new Error(
        `Missing required inputs. Check connections for profileId, schema, messages, and maxResponseToken.`,
      );
    }
  }

  private async executeSchemaNode(node: SpecNode): Promise<any> {
    const parseResult = SchemaNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    const topLevelObjectDefinition: SchemaTypeDefinition = { type: 'object', fields: parseResult.data.fields };
    return buildZodSchema(topLevelObjectDefinition);
  }

  private async executeProfileIdNode(node: SpecNode): Promise<any> {
    const parseResult = ProfileIdNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    return parseResult.data.profileId;
  }

  private async executeCreateCharacterNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = CreateCharacterNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    const staticData = parseResult.data;

    const name = input.name ?? staticData.name;
    if (!name) {
      throw new Error(`Character name is required.`);
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

  private async executeEditCharacterNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = EditCharacterNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    const staticData = parseResult.data;

    const characterAvatar = input.characterAvatar ?? staticData.characterAvatar;
    if (!characterAvatar) {
      throw new Error(`Character avatar is required.`);
    }

    const stContext = this.dependencies.getSillyTavernContext();
    const existingChar = stContext.characters.find((c: Character) => c.avatar === characterAvatar);
    if (!existingChar) {
      throw new Error(`Character with avatar "${characterAvatar}" not found.`);
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
      if (value) {
        // @ts-ignore
        updatedChar[field] = value;
      }
    });

    const tagsStr = input.tags ?? staticData.tags;
    if (tagsStr) {
      updatedChar.tags = tagsStr
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);
    }

    await this.dependencies.saveCharacter(updatedChar);
    return updatedChar.name;
  }

  private async executeCreateLorebookNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = CreateLorebookNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const worldName = input.worldName ?? staticData.worldName;
    if (!worldName) throw new Error(`World name is required.`);

    const success = await this.dependencies.st_createNewWorldInfo(worldName);
    if (!success) throw new Error(`Failed to create lorebook "${worldName}". It might already exist.`);
    return worldName;
  }

  private async executeCreateLorebookEntryNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = CreateLorebookEntryNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const worldName = input.worldName ?? staticData.worldName;
    const keys = input.key ?? staticData.key ?? '';
    const content = input.content ?? staticData.content ?? '';
    const comment = input.comment ?? staticData.comment ?? '';

    if (!worldName) throw new Error('World name is required.');
    if (!keys) throw new Error('Key(s) are required.');

    const newEntry: WIEntry = {
      uid: -1, // SillyTavern will assign a new UID
      key: keys.split(',').map((k: string) => k.trim()),
      content,
      comment,
      disable: false,
      keysecondary: [],
    };

    const result = await this.dependencies.applyWorldInfoEntry({
      entry: newEntry,
      selectedWorldName: worldName,
      operation: 'add',
    });

    return result.entry;
  }

  private async executeEditLorebookEntryNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = EditLorebookEntryNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const worldName = input.worldName ?? staticData.worldName;
    const entryUid = input.entryUid ?? staticData.entryUid;

    if (!worldName) throw new Error('World name is required to find the entry.');
    if (entryUid === undefined) throw new Error('Entry UID is required to identify the entry to edit.');

    const allWorlds = await this.dependencies.getWorldInfo(['all']);
    const world = allWorlds[worldName];
    if (!world) throw new Error(`Lorebook "${worldName}" not found.`);

    const entryToEdit = world.find((entry) => entry.uid === entryUid);
    if (!entryToEdit) throw new Error(`Entry with UID "${entryUid}" not found in "${worldName}".`);

    const newKeys = input.key ?? staticData.key;
    const newContent = input.content ?? staticData.content;
    const newComment = input.comment ?? staticData.comment;

    if (newKeys !== undefined) entryToEdit.key = newKeys.split(',').map((k: string) => k.trim());
    if (newContent !== undefined) entryToEdit.content = newContent;
    if (newComment !== undefined) entryToEdit.comment = newComment;

    const result = await this.dependencies.applyWorldInfoEntry({
      entry: entryToEdit,
      selectedWorldName: worldName,
      operation: 'update',
    });

    return result.entry;
  }
}

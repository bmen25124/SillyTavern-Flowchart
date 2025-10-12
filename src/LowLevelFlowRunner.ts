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
  MergeObjectsNodeDataSchema,
  JsonNodeItem,
  LogNodeDataSchema,
  CreateLorebookNodeDataSchema,
  CreateLorebookEntryNodeDataSchema,
  EditLorebookEntryNodeDataSchema,
  JsonNodeDataSchema,
  GetLorebookNodeDataSchema,
  GetLorebookEntryNodeDataSchema,
  ExecuteJsNodeDataSchema,
  GetChatMessageNodeDataSchema,
  EditChatMessageNodeDataSchema,
  SendChatMessageNodeDataSchema,
  RemoveChatMessageNodeDataSchema,
  DateTimeNodeDataSchema,
  RandomNodeDataSchema,
  StringToolsNodeDataSchema,
  MathNodeDataSchema,
} from './flow-types.js';
import { z } from 'zod';
import { FullExportData, Character, SillyTavernContext } from 'sillytavern-utils-lib/types';
import Handlebars from 'handlebars';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import { SpecEdge, SpecFlow, SpecNode } from './flow-spec.js';
import { eventEmitter } from './events.js';
import { ChatMessage } from 'sillytavern-utils-lib/types';

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
  getSillyTavernContext: () => SillyTavernContext;
  createCharacter: (data: FullExportData) => Promise<void>;
  saveCharacter: (data: Character) => Promise<void>;
  st_createNewWorldInfo: (worldName: string) => Promise<boolean>;
  applyWorldInfoEntry: (options: {
    entry: WIEntry;
    selectedWorldName: string;
    operation?: 'add' | 'update' | 'auto';
  }) => Promise<{ entry: WIEntry; operation: 'add' | 'update' }>;
  getWorldInfos: (
    include: ('all' | 'global' | 'character' | 'chat' | 'persona')[],
  ) => Promise<Record<string, WIEntry[]>>;
  sendChatMessage: (message: string, role: 'user' | 'assistant' | 'system', name?: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  saveChat: () => Promise<void>;
  st_updateMessageBlock: (messageId: number, message: any, options?: { rerenderMessage?: boolean }) => void;
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
      getLorebookNode: this.executeGetLorebookNode.bind(this),
      getLorebookEntryNode: this.executeGetLorebookEntryNode.bind(this),
      executeJsNode: this.executeExecuteJsNode.bind(this),
      getChatMessageNode: this.executeGetChatMessageNode.bind(this),
      editChatMessageNode: this.executeEditChatMessageNode.bind(this),
      sendChatMessageNode: this.executeSendChatMessageNode.bind(this),
      removeChatMessageNode: this.executeRemoveChatMessageNode.bind(this),
      dateTimeNode: this.executeDateTimeNode.bind(this),
      randomNode: this.executeRandomNode.bind(this),
      stringToolsNode: this.executeStringToolsNode.bind(this),
      mathNode: this.executeMathNode.bind(this),
    };
  }

  public async executeFlow(flow: SpecFlow, initialInput: Record<string, any>): Promise<ExecutionReport> {
    console.log(`[FlowChart] Executing flow with args`, initialInput);

    const nodeOutputs: Record<string, any> = {};
    const report: ExecutionReport = { executedNodes: [] };

    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    const nodesById = new Map(flow.nodes.map((node) => [node.id, node]));

    for (const node of flow.nodes) {
      inDegree[node.id] = 0;
      adj[node.id] = [];
    }
    for (const edge of flow.edges) {
      if (nodesById.has(edge.source) && nodesById.has(edge.target)) {
        inDegree[edge.target]++;
        adj[edge.source].push(edge.target);
      }
    }

    const queue = flow.nodes.filter((node) => inDegree[node.id] === 0).map((node) => node.id);

    try {
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        const node = nodesById.get(nodeId)!;

        const isRootNode = !flow.edges.some((e) => e.target === nodeId);
        const baseInput = isRootNode ? initialInput : {};
        const inputs = this.getNodeInputs(node, flow.edges, nodeOutputs, baseInput);

        const output = await this.executeNode(node, inputs, flow);

        nodeOutputs[nodeId] = output;
        const nodeReport = { nodeId: node.id, type: node.type, input: inputs, output: output };
        report.executedNodes.push(nodeReport);
        eventEmitter.emit('node:end', nodeReport);

        // For `ifNode`, only queue the next node on the taken branch
        if (node.type === 'ifNode' && output.nextNodeId) {
          const nextNodeId = output.nextNodeId as string;
          if (inDegree[nextNodeId] !== undefined) {
            inDegree[nextNodeId]--;
            if (inDegree[nextNodeId] === 0) {
              queue.push(nextNodeId);
            }
          }
        } else {
          // For all other nodes, queue up their successors
          for (const neighborId of adj[nodeId]) {
            if (inDegree[neighborId] !== undefined) {
              inDegree[neighborId]--;
              if (inDegree[neighborId] === 0) {
                queue.push(neighborId);
              }
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
      if (!targetHandle) {
        // A null target handle means the entire output is passed to a single input
        Object.assign(inputs, sourceOutput);
        continue;
      }

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
    // Prefer connected input value over static value in the node.
    return { value: input.value !== undefined ? String(input.value) : parseResult.data.value };
  }

  private async executeNumberNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = NumberNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    // Prefer connected input value over static value in the node.
    return { value: input.value !== undefined ? Number(input.value) : parseResult.data.value };
  }

  private async executeLogNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = LogNodeDataSchema.safeParse(node.data);
    const prefix = parseResult.success ? parseResult.data.prefix : '[LogNode]';
    console.log(prefix, input.value);
    return { value: input.value }; // Pass the value through
  }

  private async executeJsonNode(node: SpecNode): Promise<any> {
    const parseResult = JsonNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data for JsonNode: ${parseResult.error.message}`);
    }
    const data = parseResult.data;

    const buildValue = (item: JsonNodeItem): any => {
      switch (item.type) {
        case 'string':
        case 'number':
        case 'boolean':
          return item.value;
        case 'object':
          const obj: { [key: string]: any } = {};
          for (const child of item.value as JsonNodeItem[]) {
            obj[child.key] = buildValue(child);
          }
          return obj;
        case 'array':
          return (item.value as JsonNodeItem[]).map(buildValue);
      }
    };

    if (data.rootType === 'array') {
      return data.items.map(buildValue);
    }

    const rootObject: { [key: string]: any } = {};
    for (const item of data.items) {
      rootObject[item.key] = buildValue(item);
    }
    return rootObject;
  }

  private async executeHandlebarNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = HandlebarNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }

    const template = input.template ?? parseResult.data.template;
    const data = input.data ?? {};
    try {
      const compiled = Handlebars.compile(template, { noEscape: true, strict: true });
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

    const allWorlds = await this.dependencies.getWorldInfos(['all']);
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

  private async executeGetLorebookNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = GetLorebookNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const worldName = input.worldName ?? staticData.worldName;
    if (!worldName) throw new Error('World name is required.');

    const allWorlds = await this.dependencies.getWorldInfos(['all']);
    const world = allWorlds[worldName];
    if (!world) throw new Error(`Lorebook "${worldName}" not found.`);

    return { entries: world };
  }

  private async executeGetLorebookEntryNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = GetLorebookEntryNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const worldName = input.worldName ?? staticData.worldName;
    const entryUid = input.entryUid ?? staticData.entryUid;

    if (!worldName) throw new Error('World name is required.');
    if (entryUid === undefined) throw new Error('Entry UID is required.');

    const allWorlds = await this.dependencies.getWorldInfos(['all']);
    const world = allWorlds[worldName];
    if (!world) throw new Error(`Lorebook "${worldName}" not found.`);

    const entry = world.find((e) => e.uid === entryUid);
    if (!entry) throw new Error(`Entry with UID "${entryUid}" not found in "${worldName}".`);

    return {
      entry: entry,
      key: entry.key.join(', '),
      content: entry.content,
      comment: entry.comment,
    };
  }

  private async executeExecuteJsNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = ExecuteJsNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);

    try {
      const func = new Function('input', 'stContext', parseResult.data.code);
      return func(input, this.dependencies.getSillyTavernContext());
    } catch (error: any) {
      throw new Error(`Error executing JS code: ${error.message}`);
    }
  }

  private async executeGetChatMessageNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = GetChatMessageNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const messageIdInput = input.messageId ?? staticData.messageId;
    if (messageIdInput === undefined) throw new Error('Message ID is required.');

    const { chat } = this.dependencies.getSillyTavernContext();
    let message: ChatMessage | undefined;
    let messageIndex: number;

    if (typeof messageIdInput === 'number') {
      messageIndex = chat.findIndex((_, i) => i === messageIdInput);
    } else {
      const idStr = String(messageIdInput).toLowerCase().trim();
      if (idStr === 'last') {
        messageIndex = chat.length - 1;
      } else if (idStr === 'first') {
        messageIndex = 0;
      } else if (idStr.startsWith('last')) {
        const offset = parseInt(idStr.replace('last', '').trim(), 10) || 0;
        messageIndex = chat.length - 1 + offset;
      } else {
        messageIndex = parseInt(idStr, 10);
      }
    }

    if (isNaN(messageIndex) || messageIndex < 0 || messageIndex >= chat.length) {
      throw new Error(`Message with ID/Index "${messageIdInput}" not found or invalid.`);
    }

    message = chat[messageIndex];

    return {
      id: messageIndex,
      result: message,
      name: message.name,
      mes: message.mes,
      is_user: !!message.is_user,
      is_system: !!message.is_system,
    };
  }

  private async executeEditChatMessageNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = EditChatMessageNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const messageId = input.messageId ?? staticData.messageId;
    const newMessage = input.message ?? staticData.message;

    if (messageId === undefined) throw new Error('Message ID is required.');
    if (newMessage === undefined) throw new Error('New message content is required.');

    const { chat } = this.dependencies.getSillyTavernContext();
    const message = chat[messageId];
    if (!message) throw new Error(`Message with ID ${messageId} not found.`);

    message.mes = newMessage;
    this.dependencies.st_updateMessageBlock(messageId, message);
    await this.dependencies.saveChat();
    return { messageObject: message };
  }

  private async executeSendChatMessageNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = SendChatMessageNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const message = input.message ?? staticData.message;
    const role = input.role ?? staticData.role;
    const name = input.name ?? staticData.name;

    if (!message) throw new Error('Message content is required.');

    await this.dependencies.sendChatMessage(message, role, name);
    return { messageSent: true };
  }

  private async executeRemoveChatMessageNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = RemoveChatMessageNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const messageId = input.messageId ?? staticData.messageId;
    if (messageId === undefined) throw new Error('Message ID is required.');

    await this.dependencies.deleteMessage(messageId);
    return {};
  }

  private async executeDateTimeNode(node: SpecNode): Promise<any> {
    const parseResult = DateTimeNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);

    const now = new Date();
    return {
      iso: now.toISOString(),
      timestamp: now.getTime(),
      year: now.getFullYear(),
      month: now.getMonth() + 1, // 1-indexed
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
    };
  }

  private async executeRandomNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = RandomNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;
    const mode = staticData.mode;

    if (mode === 'number') {
      const min = input.min ?? staticData.min ?? 0;
      const max = input.max ?? staticData.max ?? 100;
      const result = Math.random() * (max - min) + min;
      return { result };
    }

    if (mode === 'array') {
      const arr = input.array;
      if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error('Input is not a non-empty array.');
      }
      const randomIndex = Math.floor(Math.random() * arr.length);
      return { result: arr[randomIndex] };
    }

    throw new Error(`Unknown random mode: ${mode}`);
  }

  private async executeStringToolsNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = StringToolsNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const { operation } = parseResult.data;
    const delimiter = input.delimiter ?? parseResult.data.delimiter ?? '';

    switch (operation) {
      case 'merge':
        const strings = Object.keys(input)
          .filter((key) => key.startsWith('string_'))
          .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10))
          .map((key) => String(input[key]));
        return { result: strings.join(delimiter) };

      case 'split':
        const strToSplit = input.string;
        if (typeof strToSplit !== 'string') throw new Error('Input for split must be a string.');
        return { result: strToSplit.split(delimiter) };

      case 'join':
        const arrToJoin = input.array;
        if (!Array.isArray(arrToJoin)) throw new Error('Input for join must be an array.');
        return { result: arrToJoin.join(delimiter) };

      default:
        throw new Error(`Unknown string operation: ${operation}`);
    }
  }

  private async executeMathNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = MathNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;
    const operation = staticData.operation;
    const a = input.a ?? staticData.a ?? 0;
    const b = input.b ?? staticData.b ?? 0;

    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('Both inputs must be numbers.');
    }

    switch (operation) {
      case 'add':
        return { result: a + b };
      case 'subtract':
        return { result: a - b };
      case 'multiply':
        return { result: a * b };
      case 'divide':
        if (b === 0) throw new Error('Division by zero.');
        return { result: a / b };
      case 'modulo':
        if (b === 0) throw new Error('Division by zero for modulo.');
        return { result: a % b };
      default:
        throw new Error(`Unknown math operation: ${operation}`);
    }
  }
}

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
  GetPromptNodeDataSchema,
  SetVariableNodeDataSchema,
  GetVariableNodeDataSchema,
  RegexNodeDataSchema,
  RunSlashCommandNodeDataSchema,
  TypeConverterNodeDataSchema,
  PickCharacterNodeDataSchema,
  PickLorebookNodeDataSchema,
  PickPromptNodeDataSchema,
  PickMathOperationNodeDataSchema,
  PickStringToolsOperationNodeDataSchema,
  PickPromptEngineeringModeNodeDataSchema,
  PickRandomModeNodeDataSchema,
  PickRegexModeNodeDataSchema,
  PickTypeConverterTargetNodeDataSchema,
  PickRegexScriptNodeDataSchema,
} from './flow-types.js';
import { z } from 'zod';
import { FullExportData, Character, SillyTavernContext } from 'sillytavern-utils-lib/types';
import Handlebars from 'handlebars';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import { SpecEdge, SpecFlow, SpecNode } from './flow-spec.js';
import { eventEmitter } from './events.js';
import { settingsManager } from './config.js';
import { nodeDefinitionMap } from './components/nodes/definitions/definitions.js';
import { NodeReport } from './components/popup/flowRunStore.js';

export interface ExecutionReport {
  executedNodes: {
    nodeId: string;
    type: string | undefined;
    input: Record<string, any>;
    output: any;
  }[];
  error?: {
    nodeId: string;
    message: string;
  };
}

export interface SlashCommandClosureResult {
  interrupt: boolean;
  pipe?: string;
  isBreak: boolean;
  isAborted: boolean;
  isQuietlyAborted: boolean;
  abortReason?: string;
  isError: boolean;
  errorMessage?: string;
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
  st_runRegexScript: (script: any, content: string) => string;
  executeSlashCommandsWithOptions: (text: string, options?: any) => Promise<SlashCommandClosureResult>;
}

type NodeExecutor = (
  node: SpecNode,
  input: Record<string, any>,
  context: {
    flow: SpecFlow;
    executionVariables: Map<string, any>;
  },
) => Promise<any>;

type ReportSanitizer = (data: any) => any;

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
  private reportSanitizers: Record<string, { input?: ReportSanitizer; output?: ReportSanitizer }>;

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
      getPromptNode: this.executeGetPromptNode.bind(this),
      setVariableNode: this.executeSetVariableNode.bind(this),
      getVariableNode: this.executeGetVariableNode.bind(this),
      regexNode: this.executeRegexNode.bind(this),
      runSlashCommandNode: this.executeRunSlashCommandNode.bind(this),
      typeConverterNode: this.executeTypeConverterNode.bind(this),
      pickCharacterNode: this.executePickCharacterNode.bind(this),
      pickLorebookNode: this.executePickLorebookNode.bind(this),
      pickPromptNode: this.executePickPromptNode.bind(this),
      pickRegexScriptNode: this.executePickRegexScriptNode.bind(this),
      pickMathOperationNode: this.executePickMathOperationNode.bind(this),
      pickStringToolsOperationNode: this.executePickStringToolsOperationNode.bind(this),
      pickPromptEngineeringModeNode: this.executePickPromptEngineeringModeNode.bind(this),
      pickRandomModeNode: this.executePickRandomModeNode.bind(this),
      pickRegexModeNode: this.executePickRegexModeNode.bind(this),
      pickTypeConverterTargetNode: this.executePickTypeConverterTargetNode.bind(this),
    };
    this.reportSanitizers = {};
  }

  public async executeFlow(runId: string, flow: SpecFlow, initialInput: Record<string, any>): Promise<ExecutionReport> {
    console.log(`[FlowChart] Executing flow (runId: ${runId}) with args`, initialInput);

    const nodeOutputs: Record<string, any> = {};
    const executionVariables = new Map<string, any>();
    const report: ExecutionReport = { executedNodes: [] };

    const inDegree: Record<string, number> = {};
    const adj = new Map<string, SpecEdge[]>(flow.nodes.map((node) => [node.id, []]));
    const nodesById = new Map(flow.nodes.map((node) => [node.id, node]));

    for (const node of flow.nodes) {
      inDegree[node.id] = 0;
    }
    for (const edge of flow.edges) {
      if (nodesById.has(edge.source) && nodesById.has(edge.target)) {
        inDegree[edge.target]++;
        adj.get(edge.source)!.push(edge);
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

        eventEmitter.emit('node:run:start', { runId, nodeId });
        const nodeReport: NodeReport = { status: 'completed', input: inputs, output: {}, error: undefined };
        try {
          const output = await this.executeNode(node, inputs, { flow, executionVariables });
          nodeReport.output = output;
        } catch (error: any) {
          nodeReport.status = 'error';
          nodeReport.error = error.message;
          nodeReport.output = null; // No output on error
        }

        nodeOutputs[nodeId] = nodeReport.output;
        report.executedNodes.push({ nodeId: node.id, type: node.type, input: inputs, output: nodeReport.output });
        eventEmitter.emit('node:run:end', { runId, nodeId: node.id, report: nodeReport });

        if (nodeReport.status === 'error') {
          const enhancedError = new Error(nodeReport.error);
          (enhancedError as any).nodeId = node.id;
          throw enhancedError;
        }

        const outgoingEdges = adj.get(nodeId) || [];
        let edgesToFollow = outgoingEdges;

        if (node.type === 'ifNode' && nodeReport.output?.activatedHandle) {
          edgesToFollow = outgoingEdges.filter((edge) => edge.sourceHandle === nodeReport.output.activatedHandle);
        }

        for (const edge of edgesToFollow) {
          const neighborId = edge.target;
          if (inDegree[neighborId] !== undefined) {
            inDegree[neighborId]--;
            if (inDegree[neighborId] === 0) {
              queue.push(neighborId);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('[FlowChart] Flow execution aborted due to an error.', error);
      report.error = {
        nodeId: error.nodeId || 'unknown',
        message: error.message || String(error),
      };
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

  private async executeNode(
    node: SpecNode,
    input: Record<string, any>,
    context: {
      flow: SpecFlow;
      executionVariables: Map<string, any>;
    },
  ): Promise<any> {
    if (node.type === 'groupNode') return {};

    const executor = this.nodeExecutors[node.type];
    if (executor) {
      console.log(`[FlowChart] Executing node ${node.id} (${node.type}) with input:`, input);
      try {
        return await executor(node, input, context);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const enhancedError = new Error(`Execution failed at node ${node.id} (${node.type}): ${errorMessage}`);
        (enhancedError as any).nodeId = node.id;
        throw enhancedError;
      }
    }
    return {};
  }

  private resolveInput<T extends object, K extends keyof T>(input: Record<string, any>, staticData: T, key: K): T[K] {
    return input[key as string] ?? staticData[key];
  }

  private async executeGetPromptNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = GetPromptNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const promptName = this.resolveInput(input, parseResult.data, 'promptName');

    if (!promptName) throw new Error('Prompt name not provided.');

    const settings = settingsManager.getSettings();
    const prompt = settings.prompts[promptName];

    if (prompt === undefined) throw new Error(`Prompt "${promptName}" not found.`);

    return prompt;
  }

  private async executeSetVariableNode(
    node: SpecNode,
    input: Record<string, any>,
    context: { executionVariables: Map<string, any> },
  ): Promise<any> {
    const parseResult = SetVariableNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);

    const variableName = this.resolveInput(input, parseResult.data, 'variableName');
    const value = input.value;

    if (!variableName) throw new Error('Variable name is required.');

    context.executionVariables.set(variableName, value);

    return { value }; // Passthrough
  }

  private async executeGetVariableNode(
    node: SpecNode,
    input: Record<string, any>,
    context: { executionVariables: Map<string, any> },
  ): Promise<any> {
    const parseResult = GetVariableNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const variableName = this.resolveInput(input, parseResult.data, 'variableName');

    if (!variableName) throw new Error('Variable name is required.');

    if (!context.executionVariables.has(variableName))
      throw new Error(`Execution variable "${variableName}" not found.`);
    return { value: context.executionVariables.get(variableName) };
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
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const profileId = this.resolveInput(input, staticData, 'profileId');
    const lastMessageId = this.resolveInput(input, staticData, 'lastMessageId');

    if (!profileId) throw new Error(`Profile ID not provided.`);

    return this.dependencies.getBaseMessagesForProfile(profileId, lastMessageId);
  }

  private async executeCustomMessageNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = CustomMessageNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    return parseResult.data.messages.map(({ id, role, content }) => ({
      role: this.resolveInput(input, { [`${id}_role`]: role }, `${id}_role`),
      content: this.resolveInput(input, { [id]: content }, id),
    }));
  }

  private async executeMergeMessagesNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = MergeMessagesNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const definition = nodeDefinitionMap.get('mergeMessagesNode')!;

    return Object.keys(input)
      .filter((key) => definition.isDynamicHandle!(key) && Array.isArray(input[key]))
      .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10))
      .flatMap((key) => input[key]);
  }

  private async executeMergeObjectsNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = MergeObjectsNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const definition = nodeDefinitionMap.get('mergeObjectsNode')!;

    const objectsToMerge = Object.keys(input)
      .filter((key) => definition.isDynamicHandle!(key) && typeof input[key] === 'object' && input[key] !== null)
      .sort((a, b) => parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10))
      .map((key) => input[key]);

    return Object.assign({}, ...objectsToMerge);
  }

  private async executeIfNode(
    node: SpecNode,
    input: Record<string, any>,
    context: { flow: SpecFlow; executionVariables: Map<string, any> },
  ): Promise<any> {
    const parseResult = IfNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    const { executionVariables } = context;
    const variables = { ...Object.fromEntries(executionVariables) };

    for (const condition of parseResult.data.conditions) {
      try {
        const func = new Function('input', 'variables', 'stContext', condition.code);
        if (func(input, variables, this.dependencies.getSillyTavernContext())) {
          return { activatedHandle: condition.id };
        }
      } catch (error: any) {
        throw new Error(`Error executing condition code: ${error.message}`);
      }
    }

    return { activatedHandle: 'false' };
  }

  private async executeStringNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = StringNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    const value = this.resolveInput(input, parseResult.data, 'value');
    return { value: String(value) };
  }

  private async executeNumberNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = NumberNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    const value = this.resolveInput(input, parseResult.data, 'value');
    return { value: Number(value) };
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
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const template = this.resolveInput(input, staticData, 'template');
    const context = { ...input };
    delete context.template;

    try {
      const compiled = Handlebars.compile(template, { noEscape: true, strict: true });
      return { result: compiled(context) };
    } catch (e: any) {
      throw new Error(`Error executing handlebar template: ${e.message}`);
    }
  }

  private async executeGetCharacterNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = GetCharacterNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);

    const characterAvatar = this.resolveInput(input, parseResult.data, 'characterAvatar');
    if (!characterAvatar) throw new Error('No character avatar provided.');

    const stContext = this.dependencies.getSillyTavernContext();
    let character = stContext.characters.find((c: Character) => c.avatar === characterAvatar);
    if (!character) throw new Error(`Character with avatar ${characterAvatar} not found.`);
    character = structuredClone(character);
    delete character?.data?.json_data;
    delete character?.json_data;

    return { ...character, result: character };
  }

  private async executeStructuredRequestNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = StructuredRequestNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const profileId = this.resolveInput(input, staticData, 'profileId');
    const schemaName = this.resolveInput(input, staticData, 'schemaName');
    const maxResponseToken = this.resolveInput(input, staticData, 'maxResponseToken');
    const promptEngineeringMode = this.resolveInput(input, staticData, 'promptEngineeringMode');
    const { messages, schema } = input;

    if (!profileId || !schema || !messages || maxResponseToken === undefined) {
      throw new Error(
        `Missing required inputs. Check connections for profileId, schema, messages, and maxResponseToken.`,
      );
    }
    const result = await this.dependencies.makeStructuredRequest(
      profileId,
      messages,
      schema,
      schemaName || 'response',
      promptEngineeringMode,
      maxResponseToken,
    );
    return { ...result, result };
  }

  private async executeSchemaNode(node: SpecNode): Promise<any> {
    const parseResult = SchemaNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    const topLevelObjectDefinition: SchemaTypeDefinition = { type: 'object', fields: parseResult.data.fields };
    return buildZodSchema(topLevelObjectDefinition);
  }

  private async executeProfileIdNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = ProfileIdNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) {
      throw new Error(`Invalid data: ${parseResult.error.message}`);
    }
    const staticData = parseResult.data;

    // A null input handle means the entire upstream output is in `input`.
    // We intelligently extract the ID from common output shapes.
    let resolvedId: string | undefined;
    if (typeof input === 'string') {
      resolvedId = input;
    } else if (typeof input === 'object' && input !== null) {
      resolvedId = input.profileId ?? input.value;
    }

    return resolvedId && typeof resolvedId === 'string' ? resolvedId : staticData.profileId;
  }

  private async executeCreateCharacterNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = CreateCharacterNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const name = this.resolveInput(input, staticData, 'name');
    if (!name) throw new Error(`Character name is required.`);

    const tagsStr = this.resolveInput(input, staticData, 'tags') ?? '';
    const charData: FullExportData = {
      name,
      description: this.resolveInput(input, staticData, 'description') ?? '',
      first_mes: this.resolveInput(input, staticData, 'first_mes') ?? '',
      scenario: this.resolveInput(input, staticData, 'scenario') ?? '',
      personality: this.resolveInput(input, staticData, 'personality') ?? '',
      mes_example: this.resolveInput(input, staticData, 'mes_example') ?? '',
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
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const characterAvatar = this.resolveInput(input, staticData, 'characterAvatar');
    if (!characterAvatar) throw new Error(`Character avatar is required.`);

    const stContext = this.dependencies.getSillyTavernContext();
    let existingChar = stContext.characters.find((c: Character) => c.avatar === characterAvatar);
    if (!existingChar) throw new Error(`Character with avatar "${characterAvatar}" not found.`);
    existingChar = structuredClone(existingChar);
    delete existingChar?.data?.json_data;
    delete existingChar?.json_data;

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
      const value = this.resolveInput(input, staticData, field);
      if (value) {
        // @ts-ignore
        updatedChar[field] = value;
      }
    });

    const tagsStr = this.resolveInput(input, staticData, 'tags');
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
    const worldName = this.resolveInput(input, parseResult.data, 'worldName');
    if (!worldName) throw new Error(`World name is required.`);

    const success = await this.dependencies.st_createNewWorldInfo(worldName);
    if (!success) throw new Error(`Failed to create lorebook "${worldName}". It might already exist.`);
    return worldName;
  }

  private async executeCreateLorebookEntryNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = CreateLorebookEntryNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const worldName = this.resolveInput(input, staticData, 'worldName');
    const keys = this.resolveInput(input, staticData, 'key') ?? '';
    if (!worldName) throw new Error('World name is required.');
    if (!keys) throw new Error('Key(s) are required.');

    const newEntry: WIEntry = {
      uid: -1, // SillyTavern will assign a new UID
      key: keys.split(',').map((k: string) => k.trim()),
      content: this.resolveInput(input, staticData, 'content') ?? '',
      comment: this.resolveInput(input, staticData, 'comment') ?? '',
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

    const worldName = this.resolveInput(input, staticData, 'worldName');
    const entryUid = this.resolveInput(input, staticData, 'entryUid');
    if (!worldName) throw new Error('World name is required to find the entry.');
    if (entryUid === undefined) throw new Error('Entry UID is required to identify the entry to edit.');

    const allWorlds = await this.dependencies.getWorldInfos(['all']);
    const world = allWorlds[worldName];
    if (!world) throw new Error(`Lorebook "${worldName}" not found.`);

    const entryToEdit = world.find((entry) => entry.uid === entryUid);
    if (!entryToEdit) throw new Error(`Entry with UID "${entryUid}" not found in "${worldName}".`);

    const newKeys = this.resolveInput(input, staticData, 'key');
    if (newKeys) {
      entryToEdit.key = newKeys.split(',').map((k: string) => k.trim());
    }

    const newContent = this.resolveInput(input, staticData, 'content');
    if (newContent) {
      entryToEdit.content = newContent;
    }

    const newComment = this.resolveInput(input, staticData, 'comment');
    if (newComment) {
      entryToEdit.comment = newComment;
    }

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
    const worldName = this.resolveInput(input, parseResult.data, 'worldName');
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

    const worldName = this.resolveInput(input, staticData, 'worldName');
    const entryUid = this.resolveInput(input, staticData, 'entryUid');
    if (!worldName) throw new Error('World name is required.');
    if (entryUid === undefined) throw new Error('Entry UID is required.');

    const allWorlds = await this.dependencies.getWorldInfos(['all']);
    const world = allWorlds[worldName];
    if (!world) throw new Error(`Lorebook "${worldName}" not found.`);

    const entry = world.find((e) => e.uid === entryUid);
    if (!entry) throw new Error(`Entry with UID "${entryUid}" not found in "${worldName}".`);

    return { entry, key: entry.key.join(', '), content: entry.content, comment: entry.comment };
  }

  private async executeExecuteJsNode(
    node: SpecNode,
    input: Record<string, any>,
    context: { executionVariables: Map<string, any> },
  ): Promise<any> {
    const parseResult = ExecuteJsNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const { executionVariables } = context;
    const variables = { ...Object.fromEntries(executionVariables) };
    try {
      const func = new Function('input', 'variables', 'stContext', parseResult.data.code);
      return func(input, variables, this.dependencies.getSillyTavernContext());
    } catch (error: any) {
      throw new Error(`Error executing JS code: ${error.message}`);
    }
  }

  private async executeGetChatMessageNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = GetChatMessageNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const messageIdInput = this.resolveInput(input, parseResult.data, 'messageId');
    if (messageIdInput === undefined) throw new Error('Message ID is required.');

    const { chat } = this.dependencies.getSillyTavernContext();
    let messageIndex: number;

    if (typeof messageIdInput === 'number') {
      messageIndex = chat.findIndex((_, i) => i === messageIdInput);
    } else {
      const idStr = String(messageIdInput).toLowerCase().trim();
      if (idStr === 'last') {
        messageIndex = chat.length - 1;
      } else if (idStr === 'first') {
        messageIndex = 0;
      } else {
        messageIndex = parseInt(idStr, 10);
      }
    }

    if (isNaN(messageIndex) || messageIndex < 0 || messageIndex >= chat.length) {
      throw new Error(`Message with ID/Index "${messageIdInput}" not found or invalid.`);
    }
    const message = structuredClone(chat[messageIndex]);
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

    const messageId = this.resolveInput(input, staticData, 'messageId');
    const newMessage = this.resolveInput(input, staticData, 'message');
    if (messageId === undefined) throw new Error('Message ID is required.');
    if (newMessage === undefined) throw new Error('New message content is required.');

    const { chat } = this.dependencies.getSillyTavernContext();
    const message = chat[messageId];
    if (!message) throw new Error(`Message with ID ${messageId} not found.`);

    message.mes = newMessage;
    this.dependencies.st_updateMessageBlock(messageId, message);
    await this.dependencies.saveChat();
    return { messageObject: structuredClone(message) };
  }

  private async executeSendChatMessageNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = SendChatMessageNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;

    const message = this.resolveInput(input, staticData, 'message');
    if (!message) throw new Error('Message content is required.');

    const role = this.resolveInput(input, staticData, 'role');
    const name = this.resolveInput(input, staticData, 'name');
    await this.dependencies.sendChatMessage(message, role, name);

    const newChatLength = this.dependencies.getSillyTavernContext().chat.length;
    return { messageId: newChatLength - 1 };
  }

  private async executeRemoveChatMessageNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = RemoveChatMessageNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const messageId = this.resolveInput(input, parseResult.data, 'messageId');
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
      month: now.getMonth() + 1,
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
    const mode = this.resolveInput(input, staticData, 'mode') ?? 'number';

    if (mode === 'number') {
      const min = this.resolveInput(input, staticData, 'min') ?? 0;
      const max = this.resolveInput(input, staticData, 'max') ?? 100;
      return { result: Math.random() * (max - min) + min };
    }
    if (mode === 'array') {
      const arr = input.array;
      if (!Array.isArray(arr) || arr.length === 0) throw new Error('Input is not a non-empty array.');
      const randomIndex = Math.floor(Math.random() * arr.length);
      return { result: arr[randomIndex] };
    }
    throw new Error(`Unknown random mode: ${mode}`);
  }

  private async executeStringToolsNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = StringToolsNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const operation = this.resolveInput(input, parseResult.data, 'operation') ?? 'merge';
    const delimiter = this.resolveInput(input, parseResult.data, 'delimiter') ?? '';
    const definition = nodeDefinitionMap.get('stringToolsNode')!;

    switch (operation) {
      case 'merge':
        const strings = Object.keys(input)
          .filter((key) => definition.isDynamicHandle!(key))
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
    const operation = this.resolveInput(input, staticData, 'operation') ?? 'add';
    const a = this.resolveInput(input, staticData, 'a') ?? 0;
    const b = this.resolveInput(input, staticData, 'b') ?? 0;

    if (typeof a !== 'number' || typeof b !== 'number') throw new Error('Both inputs must be numbers.');

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

  private async executeRegexNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = RegexNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const staticData = parseResult.data;
    const mode = this.resolveInput(input, staticData, 'mode') ?? 'sillytavern';
    const scriptId = this.resolveInput(input, staticData, 'scriptId');
    const { findRegex, replaceString } = staticData;
    const inputString = input.string ?? '';
    if (typeof inputString !== 'string') throw new Error('Input must be a string.');

    let result = inputString;
    let matches: string[] | null = null;
    let finalFindRegex: string | undefined;

    if (mode === 'sillytavern') {
      if (!scriptId) throw new Error('SillyTavern Regex ID is not provided.');
      const { extensionSettings } = this.dependencies.getSillyTavernContext();
      const script = (extensionSettings.regex ?? []).find((r: any) => r.id === scriptId);
      if (!script) throw new Error(`Regex with ID "${scriptId}" not found.`);
      result = this.dependencies.st_runRegexScript(script, inputString);
      finalFindRegex = script.findRegex;
    } else {
      // custom mode
      if (findRegex === undefined) throw new Error('Find Regex is required for custom mode.');
      try {
        const regex = new RegExp(findRegex, 'g');
        result = inputString.replace(regex, replaceString ?? '');
        finalFindRegex = findRegex;
      } catch (e: any) {
        throw new Error(`Invalid custom regex: ${e.message}`);
      }
    }

    if (finalFindRegex) {
      try {
        matches = inputString.match(new RegExp(finalFindRegex, 'g'));
      } catch (e: any) {
        // Ignore match error if regex is invalid
      }
    }

    return { result, matches: matches ?? [] };
  }

  private async executeRunSlashCommandNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = RunSlashCommandNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const command = this.resolveInput(input, parseResult.data, 'command');

    if (!command || typeof command !== 'string') throw new Error('Command input must be a valid string.');

    const result = await this.dependencies.executeSlashCommandsWithOptions(command);

    if (result.isError) {
      throw new Error(`Slash command failed: ${result.errorMessage}`);
    }
    if (result.isAborted) {
      throw new Error(`Slash command aborted: ${result.abortReason}`);
    }

    return { result: result.pipe ?? '' };
  }

  private async executeTypeConverterNode(node: SpecNode, input: Record<string, any>): Promise<any> {
    const parseResult = TypeConverterNodeDataSchema.safeParse(node.data);
    if (!parseResult.success) throw new Error(`Invalid data: ${parseResult.error.message}`);
    const targetType = this.resolveInput(input, parseResult.data, 'targetType') ?? 'string';
    const value = input.value;

    if (value === undefined) {
      // Handle undefined input gracefully for each type
      switch (targetType) {
        case 'string':
          return { result: '' };
        case 'number':
          return { result: 0 };
        case 'object':
          return { result: {} };
        case 'array':
          return { result: [] };
      }
    }

    try {
      switch (targetType) {
        case 'string':
          if (typeof value === 'object' && value !== null) {
            return { result: JSON.stringify(value, null, 2) };
          }
          return { result: String(value) };
        case 'number':
          const num = parseFloat(value);
          if (isNaN(num)) throw new Error(`'${value}' cannot be converted to a number.`);
          return { result: num };
        case 'object':
        case 'array':
          if (typeof value === 'object') return { result: value }; // It's already an object/array
          if (typeof value !== 'string') throw new Error('Input must be a JSON string to convert to object/array.');
          const parsed = JSON.parse(value);
          if (targetType === 'array' && !Array.isArray(parsed)) {
            throw new Error('Parsed JSON is not an array.');
          }
          if (targetType === 'object' && (Array.isArray(parsed) || typeof parsed !== 'object')) {
            throw new Error('Parsed JSON is not an object.');
          }
          return { result: parsed };
        default:
          throw new Error(`Unsupported target type: ${targetType}`);
      }
    } catch (e: any) {
      throw new Error(`Type conversion failed: ${e.message}`);
    }
  }

  // Picker Node Executors
  private async executePickCharacterNode(node: SpecNode): Promise<any> {
    const data = PickCharacterNodeDataSchema.parse(node.data);
    return { avatar: data.characterAvatar };
  }
  private async executePickLorebookNode(node: SpecNode): Promise<any> {
    const data = PickLorebookNodeDataSchema.parse(node.data);
    return { name: data.worldName };
  }
  private async executePickPromptNode(node: SpecNode): Promise<any> {
    const data = PickPromptNodeDataSchema.parse(node.data);
    return { name: data.promptName };
  }
  private async executePickRegexScriptNode(node: SpecNode): Promise<any> {
    const data = PickRegexScriptNodeDataSchema.parse(node.data);
    return { id: data.scriptId };
  }
  private async executePickMathOperationNode(node: SpecNode): Promise<any> {
    const data = PickMathOperationNodeDataSchema.parse(node.data);
    return { operation: data.operation };
  }
  private async executePickStringToolsOperationNode(node: SpecNode): Promise<any> {
    const data = PickStringToolsOperationNodeDataSchema.parse(node.data);
    return { operation: data.operation };
  }
  private async executePickPromptEngineeringModeNode(node: SpecNode): Promise<any> {
    const data = PickPromptEngineeringModeNodeDataSchema.parse(node.data);
    return { mode: data.mode };
  }
  private async executePickRandomModeNode(node: SpecNode): Promise<any> {
    const data = PickRandomModeNodeDataSchema.parse(node.data);
    return { mode: data.mode };
  }
  private async executePickRegexModeNode(node: SpecNode): Promise<any> {
    const data = PickRegexModeNodeDataSchema.parse(node.data);
    return { mode: data.mode };
  }
  private async executePickTypeConverterTargetNode(node: SpecNode): Promise<any> {
    const data = PickTypeConverterTargetNodeDataSchema.parse(node.data);
    return { type: data.targetType };
  }
}

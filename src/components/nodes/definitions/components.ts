import { FC } from 'react';
import { NodeProps, Node } from '@xyflow/react';

// Trigger
import { TriggerNode } from '../TriggerNode.js';
import { ManualTriggerNode } from '../ManualTriggerNode.js';

// Logic
import { IfNode } from '../IfNode.js';

// Input
import { StringNode } from '../StringNode.js';
import { NumberNode } from '../NumberNode.js';
import { ProfileIdNode } from '../ProfileIdNode.js';

// API Request
import { CreateMessagesNode } from '../CreateMessagesNode.js';
import { CustomMessageNode } from '../CustomMessageNode.js';
import { MergeMessagesNode } from '../MergeMessagesNode.js';
import { StructuredRequestNode } from '../StructuredRequestNode.js';

// Chat
import { GetChatMessageNode } from '../GetChatMessageNode.js';
import { EditChatMessageNode } from '../EditChatMessageNode.js';
import { SendChatMessageNode } from '../SendChatMessageNode.js';
import { RemoveChatMessageNode } from '../RemoveChatMessageNode.js';

// Character
import { GetCharacterNode } from '../GetCharacterNode.js';
import { CreateCharacterNode } from '../CreateCharacterNode.js';
import { EditCharacterNode } from '../EditCharacterNode.js';

// Lorebook
import { GetLorebookNode } from '../GetLorebookNode.js';
import { GetLorebookEntryNode } from '../GetLorebookEntryNode.js';
import { CreateLorebookNode } from '../CreateLorebookNode.js';
import { CreateLorebookEntryNode } from '../CreateLorebookEntryNode.js';
import { EditLorebookEntryNode } from '../EditLorebookEntryNode.js';

// JSON
import { JsonNode } from '../JsonNode.js';
import { SchemaNode } from '../SchemaNode.js';

// Utility
import { LogNode } from '../LogNode.js';
import { HandlebarNode } from '../HandlebarNode.js';
import { MergeObjectsNode } from '../MergeObjectsNode.js';
import { GroupNode } from '../GroupNode.js';
import { ExecuteJsNode } from '../ExecuteJsNode.js';
import { DateTimeNode } from '../DateTimeNode.js';
import { RandomNode } from '../RandomNode.js';
import { StringToolsNode } from '../StringToolsNode.js';
import { MathNode } from '../MathNode.js';
import { GetPromptNode } from '../GetPromptNode.js';
import { SetVariableNode } from '../SetVariableNode.js';
import { GetVariableNode } from '../GetVariableNode.js';
import { RegexNode } from '../RegexNode.js';
import { RunSlashCommandNode } from '../RunSlashCommandNode.js';
import { TypeConverterNode } from '../TypeConverterNode.js';

// Pickers
import {
  PickCharacterNode,
  PickLorebookNode,
  PickMathOperationNode,
  PickPromptEngineeringModeNode,
  PickPromptNode,
  PickRandomModeNode,
  PickRegexModeNode,
  PickRegexScriptNode,
  PickStringToolsOperationNode,
  PickTypeConverterTargetNode,
} from '../PickerNodes.js';

export const nodeTypes: Record<string, FC<NodeProps<Node<any>>>> = {
  // Core
  triggerNode: TriggerNode,
  manualTriggerNode: ManualTriggerNode,
  // Logic
  ifNode: IfNode,
  // Input
  stringNode: StringNode,
  numberNode: NumberNode,
  profileIdNode: ProfileIdNode,
  // Messaging
  createMessagesNode: CreateMessagesNode,
  customMessageNode: CustomMessageNode,
  mergeMessagesNode: MergeMessagesNode,
  structuredRequestNode: StructuredRequestNode,
  getChatMessageNode: GetChatMessageNode,
  editChatMessageNode: EditChatMessageNode,
  sendChatMessageNode: SendChatMessageNode,
  removeChatMessageNode: RemoveChatMessageNode,
  // Character
  getCharacterNode: GetCharacterNode,
  createCharacterNode: CreateCharacterNode,
  editCharacterNode: EditCharacterNode,
  // Lorebook
  getLorebookNode: GetLorebookNode,
  getLorebookEntryNode: GetLorebookEntryNode,
  createLorebookNode: CreateLorebookNode,
  createLorebookEntryNode: CreateLorebookEntryNode,
  editLorebookEntryNode: EditLorebookEntryNode,
  // JSON
  jsonNode: JsonNode,
  schemaNode: SchemaNode,
  // Utility
  logNode: LogNode,
  handlebarNode: HandlebarNode,
  mergeObjectsNode: MergeObjectsNode,
  groupNode: GroupNode,
  executeJsNode: ExecuteJsNode,
  dateTimeNode: DateTimeNode,
  randomNode: RandomNode,
  stringToolsNode: StringToolsNode,
  mathNode: MathNode,
  getPromptNode: GetPromptNode,
  setVariableNode: SetVariableNode,
  getVariableNode: GetVariableNode,
  regexNode: RegexNode,
  runSlashCommandNode: RunSlashCommandNode,
  typeConverterNode: TypeConverterNode,
  // Pickers
  pickCharacterNode: PickCharacterNode,
  pickLorebookNode: PickLorebookNode,
  pickPromptNode: PickPromptNode,
  pickRegexScriptNode: PickRegexScriptNode,
  pickMathOperationNode: PickMathOperationNode,
  pickStringToolsOperationNode: PickStringToolsOperationNode,
  pickPromptEngineeringModeNode: PickPromptEngineeringModeNode,
  pickRandomModeNode: PickRandomModeNode,
  pickRegexModeNode: PickRegexModeNode,
  pickTypeConverterTargetNode: PickTypeConverterTargetNode,
};

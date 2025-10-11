import { z } from 'zod';
import { EventNames } from 'sillytavern-utils-lib/types';
import { Connection, Edge, Node } from '@xyflow/react';

// These parameters are ordered method parameters.
// For example, `{ messageId: z.number() }` means, `function (messageId: number)`
// @ts-ignore For now no need to add others
export const EventNameParameters: Record<string, Record<string, z.ZodType>> = {
  [EventNames.USER_MESSAGE_RENDERED]: { messageId: z.number() },
  [EventNames.CHARACTER_MESSAGE_RENDERED]: { messageId: z.number() },
};

export enum FlowDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  PROFILE_ID = 'profileId',
  MESSAGES = 'messages',
  SCHEMA = 'schema',
  STRUCTURED_RESULT = 'structuredResult',
  ANY = 'any',
}

export type HandleSpec = {
  id: string | null;
  type: FlowDataType;
};

export const NodeHandleTypes: Record<string, { inputs: HandleSpec[]; outputs: HandleSpec[] }> = {
  triggerNode: {
    inputs: [],
    outputs: [],
  },
  ifNode: {
    inputs: [],
    // Outputs are for control flow. The runner doesn't pass data from them.
    // We will treat them as ANY to allow connection. The true source of data for the
    // next node will be a predecessor of the ifNode.
    outputs: [{ id: 'false', type: FlowDataType.ANY }], // + dynamic condition handles
  },
  createMessagesNode: {
    inputs: [
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
      { id: 'lastMessageId', type: FlowDataType.NUMBER },
    ],
    outputs: [{ id: null, type: FlowDataType.MESSAGES }],
  },
  customMessageNode: {
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.MESSAGES }],
  },
  mergeMessagesNode: {
    inputs: [
      // Dynamic handles are checked separately in `checkConnectionValidity`
    ],
    outputs: [{ id: null, type: FlowDataType.MESSAGES }],
  },
  stringNode: {
    inputs: [{ id: null, type: FlowDataType.ANY }], // Currently unused input
    outputs: [{ id: null, type: FlowDataType.STRING }],
  },
  numberNode: {
    inputs: [{ id: null, type: FlowDataType.ANY }], // Currently unused input
    outputs: [{ id: null, type: FlowDataType.NUMBER }],
  },
  structuredRequestNode: {
    inputs: [
      { id: 'profileId', type: FlowDataType.PROFILE_ID },
      { id: 'messages', type: FlowDataType.MESSAGES },
      { id: 'schema', type: FlowDataType.SCHEMA },
      { id: 'messageId', type: FlowDataType.NUMBER },
      { id: 'maxResponseToken', type: FlowDataType.NUMBER },
    ],
    outputs: [{ id: null, type: FlowDataType.STRUCTURED_RESULT }],
  },
  schemaNode: {
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.SCHEMA }],
  },
  profileIdNode: {
    inputs: [],
    outputs: [{ id: null, type: FlowDataType.PROFILE_ID }],
  },
};

export function checkConnectionValidity(connection: Edge | Connection, nodes: Node[]): boolean {
  const sourceNode = nodes.find((node) => node.id === connection.source);
  const targetNode = nodes.find((node) => node.id === connection.target);

  if (!sourceNode || !targetNode || !sourceNode.type || !targetNode.type) {
    return false;
  }

  const sourceHandleTypes = NodeHandleTypes[sourceNode.type]?.outputs;
  const targetHandleTypes = NodeHandleTypes[targetNode.type]?.inputs;

  if (!sourceHandleTypes || !targetHandleTypes) {
    return false;
  }

  let sourceHandleType: FlowDataType | undefined;
  if (sourceNode.type === 'ifNode') {
    // @ts-ignore
    const isConditionHandle = sourceNode.data?.conditions?.some((c: any) => c.id === connection.sourceHandle);
    if (connection.sourceHandle === 'false' || isConditionHandle) {
      sourceHandleType = FlowDataType.ANY;
    }
  } else {
    sourceHandleType = sourceHandleTypes.find((h) => h.id === connection.sourceHandle)?.type;
  }

  let targetHandleType = targetHandleTypes.find((h) => h.id === connection.targetHandle)?.type;
  if (
    !targetHandleType &&
    targetNode.type === 'mergeMessagesNode' &&
    connection.targetHandle?.startsWith('messages_')
  ) {
    targetHandleType = FlowDataType.MESSAGES;
  }

  if (!sourceHandleType || !targetHandleType) {
    return false;
  }

  if (sourceHandleType === FlowDataType.ANY || targetHandleType === FlowDataType.ANY) {
    return true;
  }
  if (targetHandleType === FlowDataType.PROFILE_ID && sourceHandleType === FlowDataType.STRING) {
    return true;
  }
  if (targetHandleType === FlowDataType.STRING && sourceHandleType === FlowDataType.PROFILE_ID) {
    return true;
  }

  return sourceHandleType === targetHandleType;
}

export const TriggerNodeDataSchema = z.object({
  selectedEventType: z.string().refine((val) => Object.values(EventNames).includes(val as any), {
    message: 'Invalid event type',
  }),
});
export type TriggerNodeData = z.infer<typeof TriggerNodeDataSchema>;

export const IfNodeDataSchema = z.object({
  conditions: z
    .array(z.object({ id: z.string(), code: z.string() }))
    .default([{ id: crypto.randomUUID(), code: 'return true;' }]),
});
export type IfNodeData = z.infer<typeof IfNodeDataSchema>;

export const CreateMessagesNodeDataSchema = z.object({
  profileId: z.string().optional(),
  lastMessageId: z.number().optional(),
});
export type CreateMessagesNodeData = z.infer<typeof CreateMessagesNodeDataSchema>;

export const CustomMessageNodeDataSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    }),
  ),
});
export type CustomMessageNodeData = z.infer<typeof CustomMessageNodeDataSchema>;

export const MergeMessagesNodeDataSchema = z.object({
  inputCount: z.number().min(1).default(2),
});
export type MergeMessagesNodeData = z.infer<typeof MergeMessagesNodeDataSchema>;

export const StringNodeDataSchema = z.object({
  value: z.string(),
});
export type StringNodeData = z.infer<typeof StringNodeDataSchema>;

export const NumberNodeDataSchema = z.object({
  value: z.number(),
});
export type NumberNodeData = z.infer<typeof NumberNodeDataSchema>;

export const StructuredRequestNodeDataSchema = z.object({
  profileId: z.string().optional(),
  schemaName: z.string().optional(),
  messageId: z.number().optional(),
  promptEngineeringMode: z.enum(['native', 'json', 'xml']),
  maxResponseToken: z.number().optional(),
});
export type StructuredRequestNodeData = z.infer<typeof StructuredRequestNodeDataSchema>;

export const SchemaNodeDataSchema = z.object({
  fields: z.array(z.object({ id: z.string(), name: z.string(), type: z.enum(['string', 'number', 'boolean']) })),
});
export type SchemaNodeData = z.infer<typeof SchemaNodeDataSchema>;

export const ProfileIdNodeDataSchema = z.object({
  profileId: z.string().optional(),
});
export type ProfileIdNodeData = z.infer<typeof ProfileIdNodeDataSchema>;

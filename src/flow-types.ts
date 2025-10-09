import { z } from 'zod';
import { EventNames } from 'sillytavern-utils-lib/types';

// These parameters are ordered method parameters.
// For example, `{ messageId: z.number() }` means, `function (messageId: number)`
// @ts-ignore For now no need to add others
export const EventNameParameters: Record<string, Record<string, z.ZodType>> = {
  [EventNames.USER_MESSAGE_RENDERED]: { messageId: z.number() },
  [EventNames.CHARACTER_MESSAGE_RENDERED]: { messageId: z.number() },
};

export const StarterNodeDataSchema = z.object({
  selectedEventType: z.string().refine((val) => Object.values(EventNames).includes(val as any), {
    message: 'Invalid event type',
  }),
});
export type StarterNodeData = z.infer<typeof StarterNodeDataSchema>;

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

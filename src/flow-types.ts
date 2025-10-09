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

export const IfElseNodeDataSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty'),
});
export type IfElseNodeData = z.infer<typeof IfElseNodeDataSchema>;

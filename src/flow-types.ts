import { z } from 'zod';
import { EventNames } from 'sillytavern-utils-lib/types';

/**
 * A mapping of SillyTavern event names to their parameter definitions.
 * The keys of the inner object represent the parameter names that will be available
 * as output handles on the TriggerNode. The order of keys is important and must
 * match the order of arguments emitted by the event.
 *
 * If an event is not defined here, the TriggerNode will fall back to providing
 * generic handles: `allArgs` (an array of all arguments) and `arg0`, `arg1`, etc.
 * for individual arguments.
 */
export const EventNameParameters: Record<string, Record<string, z.ZodType>> = {
  // Message Events
  [EventNames.USER_MESSAGE_RENDERED]: { messageId: z.number() },
  [EventNames.CHARACTER_MESSAGE_RENDERED]: { messageId: z.number() },
  [EventNames.MESSAGE_UPDATED]: { messageId: z.number() },

  // Chat / Character Events
  [EventNames.CHAT_CHANGED]: {},
};

export enum FlowDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  PROFILE_ID = 'profileId',
  MESSAGES = 'messages',
  SCHEMA = 'schema',
  STRUCTURED_RESULT = 'structuredResult',
  ANY = 'any',
}

export const FlowDataTypeColors: Record<FlowDataType, string> = {
  [FlowDataType.STRING]: '#f4e04d',
  [FlowDataType.NUMBER]: '#4df48c',
  [FlowDataType.BOOLEAN]: '#f44d4d',
  [FlowDataType.OBJECT]: '#4d8cf4',
  [FlowDataType.MESSAGES]: '#a94df4',
  [FlowDataType.SCHEMA]: '#f4a94d',
  [FlowDataType.PROFILE_ID]: '#4df4e0',
  [FlowDataType.STRUCTURED_RESULT]: '#4d8cf4',
  [FlowDataType.ANY]: '#ffffff',
};

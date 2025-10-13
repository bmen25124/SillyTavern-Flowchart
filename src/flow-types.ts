import { z } from 'zod';
import { EventNames } from 'sillytavern-utils-lib/types';

// These parameters are ordered method parameters.
// For example, `{ messageId: z.number() }` means, `function (messageId: number)`
// @ts-ignore For now no need to add others
export const EventNameParameters: Record<string, Record<string, z.ZodType>> = {
  [EventNames.USER_MESSAGE_RENDERED]: { messageId: z.number() },
  [EventNames.CHARACTER_MESSAGE_RENDERED]: { messageId: z.number() },
  [EventNames.MESSAGE_UPDATED]: { messageId: z.number() },
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

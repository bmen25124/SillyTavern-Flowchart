import { z } from 'zod';

export const WIEntrySchema = z.object({
  uid: z.number(),
  key: z.array(z.string()).describe('The trigger words for the WI entry.'),
  content: z.string().describe('The content of the WI entry.'),
  comment: z.string().describe('The comment for the WI entry. It works like a title.'),
  disable: z.boolean().optional().describe('Whether the entry is disabled.'),
});

export const WIEntryListSchema = z.array(WIEntrySchema);

export const ChatMessageSchema = z.object({
  name: z.string().describe('The name of the sender.'),
  mes: z.string().describe('The content of the message.'),
  is_user: z.boolean().describe('True if the message is from the user.'),
  is_system: z.boolean().default(false).describe('True if the message is a system message (hidden from LLM context).'),
});

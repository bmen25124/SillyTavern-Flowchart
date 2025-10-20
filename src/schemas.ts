import { z } from 'zod';

export const WIEntrySchema = z.object({
  uid: z.number(),
  key: z.array(z.string()).describe('The trigger words for the WI entry.'),
  content: z.string().describe('The content of the WI entry.'),
  comment: z.string().describe('The comment for the WI entry. It works like a title.'),
});

export const WIEntryListSchema = z.array(WIEntrySchema);

export const ChatMessageSchema = z.object({
  id: z.number().describe('The index of the message in the chat.'),
  name: z.string().describe('The name of the sender.'),
  mes: z.string().describe('The content of the message.'),
  is_user: z.boolean().describe('True if the message is from the user.'),
  is_system: z.boolean().default(false).describe('True if the message is a system message (hidden from LLM context).'),
});

export const ChatMessageSchemaWithoutId = ChatMessageSchema.omit({ id: true });

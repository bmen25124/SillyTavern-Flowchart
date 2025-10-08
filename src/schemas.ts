import { z } from 'zod';

export const WIEntrySchema = z.object({
  uid: z.number(),
  key: z.array(z.string()).describe('The trigger words for the WI entry.'),
  content: z.string().describe('The content of the WI entry.'),
  comment: z.string().describe('The comment for the WI entry. It works like a title.'),
});

export const WIEntryListSchema = z.array(WIEntrySchema);

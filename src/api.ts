import { buildPrompt, Generator, Message } from 'sillytavern-utils-lib';
import { selected_group, this_chid } from 'sillytavern-utils-lib/config';
import { ExtractedData, StreamResponse } from 'sillytavern-utils-lib/types';
import z from 'zod';
import { PromptEngineeringMode, settingsManager } from './config.js';
import { parseResponse } from './parser.js';
import { schemaToExample } from './schema-to-example.js';
import Handlebars from 'handlebars';

export async function getBaseMessagesForProfile(profileId: string, lastMessageId?: number): Promise<Message[]> {
  const { extensionSettings, CONNECT_API_MAP } = SillyTavern.getContext();
  const profile = extensionSettings.connectionManager?.profiles?.find((p) => p.id === profileId);
  if (!profile) {
    throw new Error(`Connection profile with ID ${profileId} not found. Please configure it in FlowChart settings.`);
  }
  const apiMap = profile?.api ? CONNECT_API_MAP[profile.api] : null;
  const promptResult = await buildPrompt(apiMap?.selected!, {
    targetCharacterId: this_chid,
    messageIndexesBetween: {
      end: lastMessageId,
    },
    presetName: profile?.preset,
    contextName: profile?.context,
    instructName: profile?.instruct,
    syspromptName: profile?.sysprompt,
    includeNames: !!selected_group,
  });
  return promptResult.result;
}

const generator = new Generator();

async function makeRequest(
  profileId: string,
  prompt: Message[],
  maxTokens: number,
  overridePayload: any,
  streamCallbacks?: {
    onStream: (chunk: string) => void;
  },
): Promise<ExtractedData | StreamResponse | undefined> {
  const stream = !overridePayload.json_schema && !!streamCallbacks;
  let accumulatedText = '';

  return new Promise((resolve, reject) => {
    const abortController = new AbortController();

    generator.generateRequest(
      {
        profileId,
        prompt,
        maxTokens,
        custom: { stream, signal: abortController.signal },
        overridePayload,
      },
      {
        abortController,
        onEntry: stream
          ? (_requestId, chunkData) => {
              const chunk = (chunkData as StreamResponse).text;
              accumulatedText = chunk;
              if (chunk && streamCallbacks) {
                streamCallbacks.onStream(chunk);
              }
            }
          : undefined,
        onFinish: (_requestId, data, error) => {
          if (error) return reject(error);

          if (data === undefined && error === undefined) {
            if (stream) {
              return resolve({ text: accumulatedText } as StreamResponse);
            }
            return reject(new DOMException('Request aborted by user', 'AbortError'));
          }
          resolve(data);
        },
      },
    );
  });
}

export async function makeSimpleRequest(
  profileId: string,
  baseMessages: Message[],
  maxResponseToken: number,
): Promise<string> {
  const response = (await makeRequest(profileId, baseMessages, maxResponseToken, {})) as ExtractedData;
  if (!response?.content) {
    throw new Error('LLM request failed to return content.');
  }
  return response.content as string;
}

export async function makeStructuredRequest<T extends z.ZodType<any, any, any>>(
  profileId: string,
  baseMessages: Message[],
  schema: T,
  schemaName: string,
  promptEngineeringMode: PromptEngineeringMode,
  maxResponseToken: number,
): Promise<z.infer<T>> {
  const settings = settingsManager.getSettings();

  let response: ExtractedData | undefined;
  let parsedContent: any;

  if (promptEngineeringMode === PromptEngineeringMode.NATIVE) {
    // @ts-ignore
    response = await makeRequest(profileId, baseMessages, maxResponseToken, {
      json_schema: { name: schemaName, strict: true, value: z.toJSONSchema(schema) },
    });
    if (!response?.content) {
      throw new Error(`Structured request for ${schemaName} failed to return content.`);
    }
    parsedContent = response.content;
  } else {
    const format = promptEngineeringMode as 'json' | 'xml';
    const schemaAsJson = z.toJSONSchema(schema);
    const example = schemaToExample(schemaAsJson, format);
    const schemaString = JSON.stringify(schemaAsJson, null, 2);

    const promptTemplate = settings.prompts[promptEngineeringMode];
    if (!promptTemplate) {
      throw new Error(`Prompt template for mode "${promptEngineeringMode}" not found.`);
    }

    const templateContext: any = {
      example_response: example,
    };
    if (format === 'json') {
      templateContext.schema = schemaString;
    }
    const resolvedPrompt = Handlebars.compile(promptTemplate, { noEscape: true, strict: true })(templateContext);

    // @ts-ignore
    response = await makeRequest(
      profileId,
      [...baseMessages, { role: 'user', content: resolvedPrompt }],
      maxResponseToken,
      {},
    );

    if (!response?.content) {
      throw new Error(`Structured request for ${schemaName} failed to return content.`);
    }
    parsedContent = parseResponse(response.content as string, format, { schema: schemaAsJson });
  }

  const validationResult = schema.safeParse(parsedContent);
  if (!validationResult.success) {
    console.error('Zod validation failed:', validationResult.error.issues);
    console.error('Raw content parsed:', parsedContent);
    throw new Error(`Model response failed schema validation for ${schemaName}.`);
  }

  return validationResult.data;
}

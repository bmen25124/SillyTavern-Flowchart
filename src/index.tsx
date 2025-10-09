import React from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';

import { settingsManager, FlowChartSettings } from './components/Settings.js';
import { schemaToExample } from './schema-to-example.js';
import { parseResponse } from './parser.js';

import { buildPrompt, Message, Generator } from 'sillytavern-utils-lib';
import { ExtractedData, StreamResponse } from 'sillytavern-utils-lib/types';
import { selected_group, st_echo, this_chid } from 'sillytavern-utils-lib/config';
import { PromptEngineeringMode } from './config.js';
import * as Handlebars from 'handlebars';
import { flowRunner } from './FlowRunner.js';

import './styles/main.scss';
import '@xyflow/react/dist/style.css';

const generator = new Generator();

async function getBaseMessagesForProfile(profileId: string, lastMessageId?: number): Promise<Message[]> {
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

async function initializeGlobalUI() {
  const makeRequest = (
    profileId: string,
    prompt: Message[],
    maxTokens: number,
    messageId: number,
    overridePayload: any,
    streamCallbacks?: {
      onStream: (chunk: string) => void;
    },
  ): Promise<ExtractedData | StreamResponse | undefined> => {
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
  };

  async function makeStructuredRequest<T extends z.ZodType<any, any, any>>(
    profileId: string,
    baseMessages: Message[],
    schema: T,
    schemaName: string,
    messageId: number,
    promptEngineeringMode: PromptEngineeringMode,
    maxResponseToken: number,
  ): Promise<z.infer<T>> {
    const settings = settingsManager.getSettings();

    let response: ExtractedData | undefined;
    let parsedContent: any;

    if (promptEngineeringMode === PromptEngineeringMode.NATIVE) {
      // @ts-ignore
      response = await makeRequest(profileId, baseMessages, maxResponseToken, messageId, {
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

      const promptTemplate = settings.prompts[format];
      const templateContext: any = {
        example_response: example,
      };
      if (format === 'json') {
        templateContext.schema = schemaString;
      }
      const resolvedPrompt = Handlebars.compile(promptTemplate, { noEscape: true })(templateContext);

      // @ts-ignore
      response = await makeRequest(
        profileId,
        [...baseMessages, { role: 'user', content: resolvedPrompt }],
        maxResponseToken,
        messageId,
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
}

function renderReactSettings() {
  const settingsContainer = document.getElementById('extensions_settings');
  if (!settingsContainer) {
    console.error('FlowChart: Extension settings container not found.');
    return;
  }

  let reactRootEl = document.getElementById('flowchart-react-settings-root');
  if (!reactRootEl) {
    reactRootEl = document.createElement('div');
    reactRootEl.id = 'flowchart-react-settings-root';
    settingsContainer.appendChild(reactRootEl);
  }

  const root = createRoot(reactRootEl);
  root.render(
    <React.StrictMode>
      <FlowChartSettings />
    </React.StrictMode>,
  );
}

function main() {
  renderReactSettings();
  initializeGlobalUI();
  flowRunner.initialize();
}

settingsManager
  .initializeSettings()
  .then(main)
  .catch((error) => {
    console.error(error);
    st_echo('error', 'FlowChart data migration failed. Check console for details.');
  });

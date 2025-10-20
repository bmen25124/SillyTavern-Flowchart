import { z } from 'zod';

const toSnakeCase = (str: string) => str.toLowerCase();

type EventInfoStructure = {
  [category: string]: {
    [eventName: string]: {
      description: string;
      params?: Record<string, z.ZodType>;
    };
  };
};

// Central source of truth for all event definitions
const EventInfo: EventInfoStructure = {
  'Core Messaging Events': {
    MESSAGE_RECEIVED: {
      description: 'Emitted when a new message is received/inserted into chat.',
      params: {
        messageId: z.coerce.number().describe('The ID of the message.'),
        type: z.string().optional().describe('The type of message.'),
      },
    },
    CHARACTER_MESSAGE_RENDERED: {
      description: 'Emitted after a character message is rendered in the UI.',
      params: {
        messageId: z.coerce.number().describe('The ID of the message.'),
        type: z.string().optional().describe('The type of message.'),
      },
    },
    MESSAGE_SENT: {
      description: 'Emitted when a user sends a message.',
      params: { index: z.coerce.number().describe('The index of the sent message.') },
    },
    USER_MESSAGE_RENDERED: {
      description: 'Emitted after a user message is rendered in the UI.',
      params: { index: z.coerce.number().describe('The index of the rendered message.') },
    },
    MESSAGE_EDITED: {
      description: 'Emitted when a message is edited.',
      params: { messageId: z.coerce.number().describe('The ID of the edited message.') },
    },
    MESSAGE_DELETED: {
      description: 'Emitted when a message is deleted.',
      params: { chatLength: z.coerce.number().describe('The new length of the chat.') },
    },
    MESSAGE_UPDATED: {
      description: 'Emitted when a message is updated.',
      params: { messageId: z.coerce.number().describe('The ID of the updated message.') },
    },
    MESSAGE_SWIPED: {
      description: 'Emitted when a message is swiped.',
      params: { messageIndex: z.coerce.number().describe('The index of the message that was swiped.') },
    },
    MESSAGE_SWIPE_DELETED: {
      description: 'Emitted when a message swipe is deleted.',
      params: {
        data: z
          .object({
            messageId: z.coerce.number(),
            swipeId: z.coerce.number(),
            newSwipeId: z.coerce.number(),
          })
          .describe('Object containing details about the deleted swipe.'),
      },
    },
    MORE_MESSAGES_LOADED: { description: 'Emitted when more messages are loaded (e.g., by scrolling up).' },
    IMPERSONATE_READY: {
      description: 'Emitted when an impersonation message is ready to be sent.',
      params: { text: z.string().describe('The content of the impersonation message.') },
    },
    MESSAGE_FILE_EMBEDDED: {
      description: 'Emitted when a file is embedded in a message.',
      params: { messageId: z.coerce.number().describe('The ID of the message with the embedded file.') },
    },
    MESSAGE_REASONING_EDITED: { description: "Emitted when a message's reasoning (metadata) is edited." },
    MESSAGE_REASONING_DELETED: { description: "Emitted when a message's reasoning (metadata) is deleted." },
  },
  'Chat/Group Management Events': {
    CHAT_CHANGED: {
      description: 'Emitted when the current chat changes.',
      params: { chatId: z.string().describe('The ID of the new chat.') },
    },
    CHAT_DELETED: {
      description: 'Emitted when a chat is deleted.',
      params: { chatName: z.string().describe('The name of the deleted chat.') },
    },
    CHAT_CREATED: { description: 'Emitted when a chat is created.' },
    GROUP_CHAT_DELETED: {
      description: 'Emitted when a group chat is deleted.',
      params: { chatId: z.string().describe('The ID of the deleted group chat.') },
    },
    GROUP_CHAT_CREATED: { description: 'Emitted when a new group chat is created.' },
    GROUP_UPDATED: { description: 'Emitted when group information is updated.' },
    GROUP_MEMBER_DRAFTED: {
      description: 'Emitted when a group member is drafted.',
      params: { chId: z.coerce.number().describe('The ID of the drafted character.') },
    },
    GROUP_WRAPPER_STARTED: {
      description: 'Emitted when a group message generation process starts.',
      params: {
        data: z
          .object({ selected_group: z.string(), type: z.string() })
          .describe('Data related to the group wrapper start.'),
      },
    },
    GROUP_WRAPPER_FINISHED: {
      description: 'Emitted when a group message generation process finishes.',
      params: { data: z.any().describe('Data related to the group wrapper finish.') },
    },
  },
  'Preset Management Events': {
    PRESET_CHANGED: {
      description: 'Emitted when a generation preset is changed for an API.',
      params: { data: z.object({ apiId: z.string(), name: z.string() }).describe('Preset change details.') },
    },
    PRESET_DELETED: {
      description: 'Emitted when a generation preset is deleted.',
      params: { data: z.object({ apiId: z.string(), name: z.string() }).describe('Deleted preset details.') },
    },
    PRESET_RENAMED: {
      description: 'Emitted after a generation preset is renamed.',
      params: {
        data: z
          .object({ apiId: z.string(), oldName: z.string(), newName: z.string() })
          .describe('Preset rename details.'),
      },
    },
  },
  'World Info Events': {
    WORLDINFO_SETTINGS_UPDATED: { description: 'Emitted when world info settings are updated.' },
    WORLDINFO_UPDATED: {
      description: 'Emitted when world info entries are updated.',
      params: { name: z.string().describe('The name of the updated world info.'), data: z.any() },
    },
    WORLD_INFO_ACTIVATED: {
      description: 'Emitted when world info entries are activated for context.',
      params: { entries: z.array(z.any()).describe('A list of activated world info entries.') },
    },
    WORLDINFO_FORCE_ACTIVATE: { description: 'Emitted to force world info activation.' },
    WORLDINFO_ENTRIES_LOADED: { description: 'Emitted when world info entries are loaded.' },
  },
  'API/Model Events': {
    CHATCOMPLETION_SOURCE_CHANGED: {
      description: 'Emitted when the chat completion source (API provider) changes.',
      params: { value: z.string().describe('The new API provider key.') },
    },
    CHATCOMPLETION_MODEL_CHANGED: {
      description: 'Emitted when the chat completion model changes.',
      params: { value: z.string().describe('The new model name.') },
    },
  },
  'Extension Events': {
    EXTENSIONS_FIRST_LOAD: { description: 'Emitted on the first load of extensions after the UI is ready.' },
    EXTRAS_CONNECTED: {
      description: 'Emitted when extras modules (like TTS, STT) are connected.',
      params: { modules: z.array(z.any()).describe('A list of connected modules.') },
    },
    EXTENSION_SETTINGS_LOADED: {
      description: 'Emitted when extension settings are loaded from the server.',
      params: { response: z.any().describe('The settings response object.') },
    },
  },
  'UI Rendering Events': {
    APP_READY: { description: 'Emitted when the main application UI is ready.' },
    FORCE_SET_BACKGROUND: { description: 'Emitted to force a background update.' },
    MOVABLE_PANELS_RESET: { description: 'Emitted to reset the positions of movable UI panels.' },
  },
  'Generation/Streaming Events': {
    GENERATION_STARTED: {
      description: 'Emitted when a new message generation starts.',
      params: {
        type: z.string().describe('The type of generation.'),
        options: z.any().describe('Generation options.'),
        dryRun: z.boolean().describe('Whether it is a dry run.'),
      },
    },
    GENERATION_STOPPED: { description: 'Emitted when a generation is manually stopped by the user.' },
    GENERATION_ENDED: {
      description: 'Emitted when a generation finishes successfully.',
      params: { chatLength: z.coerce.number().describe('The new length of the chat.') },
    },
    GENERATION_AFTER_COMMANDS: {
      description: 'Emitted after slash commands in a message are processed, but before generation.',
      params: {
        type: z.string().describe('The type of generation.'),
        options: z.any().describe('Generation options.'),
        dryRun: z.boolean().describe('Whether it is a dry run.'),
      },
    },
    SD_PROMPT_PROCESSING: { description: 'Emitted during Stable Diffusion prompt processing.' },
    STREAM_TOKEN_RECEIVED: {
      description: 'Emitted for each token received during a streaming generation.',
      params: { text: z.string().describe('The text token received.') },
    },
  },
  'Character Management Events': {
    CHARACTER_EDITOR_OPENED: {
      description: 'Emitted when the character editor is opened.',
      params: { chid: z.string().describe('The ID of the character being edited.') },
    },
    CHARACTER_EDITED: {
      description: "Emitted when a character's data is saved.",
      params: { data: z.any().describe('An object containing character details.') },
    },
    CHARACTER_PAGE_LOADED: { description: 'Emitted when the character management page is loaded.' },
    CHARACTER_DELETED: {
      description: 'Emitted when a character is deleted.',
      params: { data: z.any().describe('An object containing details of the deleted character.') },
    },
    CHARACTER_DUPLICATED: {
      description: 'Emitted when a character is duplicated.',
      params: { data: z.object({ oldAvatar: z.string(), newAvatar: z.string() }).describe('Avatar filenames.') },
    },
    CHARACTER_RENAMED: {
      description: 'Emitted when a character is renamed.',
      params: {
        oldAvatar: z.string().describe('The old avatar filename.'),
        newAvatar: z.string().describe('The new avatar filename.'),
      },
    },
    CHARACTER_RENAMED_IN_PAST_CHAT: {
      description: 'Emitted when a character rename affects past chats.',
      params: {
        currentChat: z.any().describe('The current chat object.'),
        oldAvatar: z.string().describe('The old avatar filename.'),
        newAvatar: z.string().describe('The new avatar filename.'),
      },
    },
    CHARACTER_FIRST_MESSAGE_SELECTED: {
      description: "Emitted when a character's greeting (first message) is selected.",
      params: { eventArgs: z.any() },
    },
    OPEN_CHARACTER_LIBRARY: { description: 'Emitted when the character library is opened.' },
  },
  'Settings Events': {
    SETTINGS_LOADED: { description: 'Emitted when global settings are loaded.' },
    SETTINGS_UPDATED: { description: 'Emitted when global settings are updated.' },
  },
  'Connection Profile Events': {
    CONNECTION_PROFILE_LOADED: {
      description: 'Emitted when a connection profile is loaded.',
      params: { profileName: z.string().describe('The name of the loaded profile.') },
    },
    CONNECTION_PROFILE_CREATED: {
      description: 'Emitted when a new connection profile is created.',
      params: { profile: z.any().describe('The new profile object.') },
    },
    CONNECTION_PROFILE_DELETED: {
      description: 'Emitted when a connection profile is deleted.',
      params: { profile: z.any().describe('The deleted profile object.') },
    },
    CONNECTION_PROFILE_UPDATED: {
      description: 'Emitted when a connection profile is updated.',
      params: {
        oldProfile: z.any().describe('The old profile object.'),
        newProfile: z.any().describe('The new profile object.'),
      },
    },
  },
  'Tool Calling Events': {
    TOOL_CALLS_PERFORMED: { description: 'Emitted when tool calls are performed.' },
    TOOL_CALLS_RENDERED: { description: 'Emitted when tool calls are rendered in the UI.' },
  },
  'API Events': {
    MAIN_API_CHANGED: {
      description: 'Emitted when the main API provider changes.',
      params: { data: z.object({ apiId: z.string() }).describe('An object containing the new API ID.') },
    },
  },
  'Online Status Events': {
    ONLINE_STATUS_CHANGED: {
      description: "Emitted when the application's online status changes.",
      params: { onlineStatus: z.boolean().describe('True if online, false if offline.') },
    },
  },
  'Image Events': {
    IMAGE_SWIPED: {
      description: 'Emitted when an image is swiped within a message.',
      params: { data: z.any().describe('Data about the swipe event.') },
    },
  },
};

// --- Auto-generated exports from EventInfo ---
// Do not edit below this line manually.

export const EventCategories: Record<string, string[]> = {};
const eventNames: Record<string, string> = {};
export const EventDescriptions: Record<string, string> = {};
export const EventNameParameters: Record<string, Record<string, z.ZodType>> = {};

for (const category in EventInfo) {
  EventCategories[category] = [];
  for (const eventName in EventInfo[category]) {
    const info = (EventInfo as any)[category][eventName];
    const eventKey = eventName;
    const eventValue = toSnakeCase(eventKey);

    eventNames[eventKey] = eventValue;
    EventCategories[category].push(eventValue);
    EventDescriptions[eventValue] = info.description;
    EventNameParameters[eventValue] = info.params || {};
  }
}

export const EventNames = eventNames;

// --- Flow Data Types ---

export enum FlowDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  PROFILE_ID = 'profileId',
  MESSAGES = 'messages',
  SCHEMA = 'schema',
  STRUCTURED_RESULT = 'structuredResult',
  CHARACTER_AVATAR = 'characterAvatar',
  LOREBOOK_NAME = 'lorebookName',
  REGEX_SCRIPT_ID = 'regexScriptId',
  FLOW_ID = 'flowId',
  ANY = 'any',
}

export const FlowDataTypeColors: Record<FlowDataType, string> = {
  [FlowDataType.STRING]: '#f4e04d',
  [FlowDataType.NUMBER]: '#4df48c',
  [FlowDataType.BOOLEAN]: '#f44d4d',
  [FlowDataType.OBJECT]: '#4d8cf4',
  [FlowDataType.ARRAY]: '#4df4c8',
  [FlowDataType.MESSAGES]: '#a94df4',
  [FlowDataType.SCHEMA]: '#f4a94d',
  [FlowDataType.PROFILE_ID]: '#4df4e0',
  [FlowDataType.STRUCTURED_RESULT]: '#4d8cf4',
  [FlowDataType.CHARACTER_AVATAR]: '#f47d4d',
  [FlowDataType.LOREBOOK_NAME]: '#f44dd9',
  [FlowDataType.REGEX_SCRIPT_ID]: '#4dd4f4',
  [FlowDataType.FLOW_ID]: '#8ff44d',
  [FlowDataType.ANY]: '#ffffff',
};

const compatibilityGroups: ReadonlyArray<ReadonlySet<FlowDataType>> = [
  new Set([
    FlowDataType.STRING,
    FlowDataType.PROFILE_ID,
    FlowDataType.CHARACTER_AVATAR,
    FlowDataType.LOREBOOK_NAME,
    FlowDataType.REGEX_SCRIPT_ID,
    FlowDataType.FLOW_ID,
  ]),
  new Set([FlowDataType.OBJECT, FlowDataType.STRUCTURED_RESULT]),
];

const compatibilityMap: ReadonlyMap<FlowDataType, ReadonlySet<FlowDataType>> = (() => {
  const map = new Map<FlowDataType, ReadonlySet<FlowDataType>>();

  const ensureEntry = (type: FlowDataType) => {
    if (!map.has(type)) {
      map.set(type, new Set());
    }
    return map.get(type) as Set<FlowDataType>;
  };

  for (const group of compatibilityGroups) {
    for (const type of group) {
      const entry = ensureEntry(type);
      for (const other of group) {
        if (other !== type) {
          entry.add(other);
        }
      }
    }
  }

  return map;
})();

export function areFlowDataTypesCompatible(source: FlowDataType, target: FlowDataType): boolean {
  if (source === target) return true;
  if (source === FlowDataType.ANY || target === FlowDataType.ANY) return true;
  const compatibleTargets = compatibilityMap.get(source);
  return compatibleTargets !== undefined && compatibleTargets.has(target);
}

export function getConvertibleFlowDataTypes(type: FlowDataType): FlowDataType[] {
  const compatible = compatibilityMap.get(type);
  if (!compatible) return [];
  return Array.from(compatible).sort();
}

export function shareFlowDataTypeFamily(a: FlowDataType, b: FlowDataType): boolean {
  if (a === b) return true;
  if (a === FlowDataType.ANY || b === FlowDataType.ANY) return false;
  const compatible = compatibilityMap.get(a);
  return !!compatible && compatible.has(b);
}

// A generic mock function that can be chained.
const mockFn = () => {};

// 1. Mock for SillyTavern runtime scripts
export const updateMessageBlock = mockFn;
export const hideChatMessageRange = mockFn;

// 2. Mocks for sillytavern-utils-lib and its subpaths

// Must be a concrete object for Zod enums in src/flow-types.ts
export const EventNames = {
    USER_MESSAGE_RENDERED: 'user_message_rendered',
    CHARACTER_MESSAGE_RENDERED: 'character_message_rendered',
    MESSAGE_UPDATED: 'message_updated',
    CHAT_CHANGED: 'chat_changed',
};

// Mock other named exports used throughout the project
export const st_createNewWorldInfo = mockFn;
export const st_echo = mockFn;
export const createCharacter = mockFn;
export const saveCharacter = mockFn;
export const applyWorldInfoEntry = mockFn;
export const getWorldInfos = mockFn;
export const buildPrompt = mockFn;
export const st_runRegexScript = mockFn;
export const executeSlashCommandsWithOptions = mockFn;
export const Generator = class { constructor() { return new Proxy({}, { get: () => mockFn }); } };
export const ExtensionSettingsManager = class { constructor() { return new Proxy({}, { get: () => mockFn }); } };

// Default export for good measure
export default mockFn;

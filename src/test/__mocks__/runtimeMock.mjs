// A generic mock function that can be chained.
const mockFn = () => {};

// 1. Mock for ../../../../../script.js
export const updateMessageBlock = mockFn;

// 2. Mocks for sillytavern-utils-lib and its subpaths

// Must be a concrete object for Zod enums in src/flow-types.ts
export const EventNames = {
    USER_MESSAGE_RENDERED: 'user_message_rendered',
    CHARACTER_MESSAGE_RENDERED: 'character_message_rendered',
};

// Mock other named exports used throughout the project
export const st_createNewWorldInfo = mockFn;
export const st_echo = mockFn;
export const createCharacter = mockFn;
export const saveCharacter = mockFn;
export const applyWorldInfoEntry = mockFn;
export const getWorldInfo = mockFn;
export const buildPrompt = mockFn;
export const Generator = class { constructor() { return new Proxy({}, { get: () => mockFn }); } };

// Default export for good measure
export default mockFn;

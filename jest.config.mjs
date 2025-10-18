/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',

    // Mock SillyTavern runtime scripts
    '../../../../chats.js': '<rootDir>/src/test/__mocks__/runtimeMock.mjs',
    '../../../../variables.js': '<rootDir>/src/test/__mocks__/runtimeMock.mjs',
    '../../../../../script.js': '<rootDir>/src/test/__mocks__/runtimeMock.mjs',

    // 2. Mock sillytavern-utils-lib AND any subpaths (like /types, /config)
    // The ^ and .*$ are crucial here.
    '^sillytavern-utils-lib.*$': '<rootDir>/src/test/__mocks__/runtimeMock.mjs',

    // Handle local .js imports
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        // Crucial for ESM support in ts-jest
        useESM: true,
        babelConfig: true,
      },
    ],
    '^.+\\.mjs$': [
      'ts-jest',
      {
        // Crucial for ESM support in ts-jest
        useESM: true,
        babelConfig: true,
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!uuid/.*)'],
};

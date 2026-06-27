import type { Config } from 'jest';

// Pin react and react-dom to the apps/client local copy so that both the
// component under test and @testing-library/react (root node_modules) share
// the same React instance. Without this the monorepo root react@19.1.0 and
// the local react@19.2.4 coexist causing "Invalid hook call".
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testRegex: '\\.spec\\.tsx?$',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
    '^react-icons/.*$': '<rootDir>/__mocks__/reactIconsMock.js',
    '^react-dom/(.*)$': '<rootDir>/node_modules/react-dom/$1',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '^react/(.*)$': '<rootDir>/node_modules/react/$1',
    '^react$': '<rootDir>/node_modules/react',
  },
};

export default config;

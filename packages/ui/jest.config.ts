import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: 'src',
  testRegex: '\\.spec\\.tsx?$',
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.ts'],
  moduleNameMapper: { '\\.(css|less|scss)$': '<rootDir>/../__mocks__/styleMock.js' },
  collectCoverageFrom: ['**/*.{ts,tsx}', '!**/*.spec.{ts,tsx}', '!**/index.ts'],
};

export default config;

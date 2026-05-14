import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '\\.spec\\.ts$',
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/index.ts'],
  coverageReporters: ['text', 'lcov'],
};

export default config;

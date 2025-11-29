import type { Config } from 'jest';

const config: Config = {
  displayName: 'cross-service-e2e',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/test-e2e',
  testMatch: ['**/*.e2e.spec.ts'],
  setupFilesAfterEnv: [],
  testTimeout: 60000,
  verbose: true,
  // E2E tests should run serially to avoid resource conflicts
  maxWorkers: 1,
  // Fail fast on first error
  bail: 1,
};

export default config;

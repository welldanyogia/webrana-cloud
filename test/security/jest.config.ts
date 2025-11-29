import type { Config } from 'jest';

const config: Config = {
  displayName: 'security-tests',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/test-security',
  testMatch: ['**/*.security.spec.ts'],
  setupFilesAfterEnv: [],
  testTimeout: 30000,
  verbose: true,
  // Security tests should run serially to ensure clean state
  maxWorkers: 1,
};

export default config;

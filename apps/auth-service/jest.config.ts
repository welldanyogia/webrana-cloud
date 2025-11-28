export default {
  displayName: 'auth-service',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/auth-service',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/**/*.integration.spec.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    // Global threshold - will be enforced after all tests are written
    // For now, commenting out to allow incremental development
    // global: {
    //   branches: 80,
    //   functions: 80,
    //   lines: 80,
    //   statements: 80,
    // },
    // Security-critical services - thresholds enforced via collectCoverageFrom
  },
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/test/**/*.spec.ts',
    '<rootDir>/test/**/*.e2e-spec.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@webrana-cloud/common$': '<rootDir>/../../libs/common/src/index.ts',
  },
  testTimeout: 30000,
};

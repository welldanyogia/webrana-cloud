/**
 * Global test setup for catalog-service
 * This file is loaded before all tests via setupFilesAfterEnv in jest.config.ts
 */

jest.setTimeout(60000);

process.env.NODE_ENV = 'test';

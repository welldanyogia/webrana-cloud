import { execSync } from 'child_process';
import { join } from 'path';

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | null = null;

export interface TestDatabaseConfig {
  databaseUrl: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

/**
 * Setup Testcontainers PostgreSQL for integration tests
 * 
 * Spins up a fresh Postgres container, runs migrations, and optionally seeds data.
 * Returns connection info for the test app.
 */
export async function setupTestDatabase(): Promise<TestDatabaseConfig> {
  // Start PostgreSQL container
  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('order_service_test')
    .withUsername('test')
    .withPassword('test')
    .withExposedPorts(5432)
    .start();

  const config: TestDatabaseConfig = {
    databaseUrl: container.getConnectionUri(),
    host: container.getHost(),
    port: container.getMappedPort(5432),
    database: 'order_service_test',
    username: 'test',
    password: 'test',
  };

  // Set DATABASE_URL for Prisma
  process.env.DATABASE_URL = config.databaseUrl;

  // Run Prisma migrations
  const prismaDir = join(__dirname, '../../prisma');
  try {
    execSync('npx prisma migrate deploy', {
      cwd: join(__dirname, '../..'),
      env: { ...process.env, DATABASE_URL: config.databaseUrl },
      stdio: 'pipe',
    });
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }

  return config;
}

/**
 * Seed the test database with sample data
 */
export async function seedTestDatabase(): Promise<void> {
  try {
    execSync('npx prisma db seed', {
      cwd: join(__dirname, '../..'),
      env: { ...process.env },
      stdio: 'pipe',
    });
  } catch (error) {
    console.error('Seeding failed:', error);
    // Seeding is optional for tests, don't throw
  }
}

/**
 * Cleanup: Stop and remove the container
 */
export async function teardownTestDatabase(): Promise<void> {
  if (container) {
    await container.stop();
    container = null;
  }
}

/**
 * Get the current test database URL
 */
export function getTestDatabaseUrl(): string {
  return process.env.DATABASE_URL || '';
}

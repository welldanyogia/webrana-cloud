import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { execSync } from 'child_process';
import { join } from 'path';

let pgContainer: StartedPostgreSqlContainer | null = null;
let redisContainer: StartedTestContainer | null = null;

export interface TestDatabaseConfig {
  databaseUrl: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface TestRedisConfig {
  host: string;
  port: number;
  url: string;
}

/**
 * Check if Docker is available
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch {
    console.warn(
      'Docker is not available. Integration tests requiring containers will be skipped.\n' +
        'To run full integration tests, please install Docker Desktop.'
    );
    return false;
  }
}

/**
 * Setup Testcontainers PostgreSQL for integration tests
 */
export async function setupTestDatabase(): Promise<TestDatabaseConfig> {
  console.log('Starting PostgreSQL container...');

  pgContainer = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('notification_service_test')
    .withUsername('test')
    .withPassword('test')
    .withExposedPorts(5432)
    .start();

  const config: TestDatabaseConfig = {
    databaseUrl: pgContainer.getConnectionUri(),
    host: pgContainer.getHost(),
    port: pgContainer.getMappedPort(5432),
    database: 'notification_service_test',
    username: 'test',
    password: 'test',
  };

  // Set DATABASE_URL for Prisma
  process.env.DATABASE_URL = config.databaseUrl;

  // Run Prisma migrations using db push
  console.log('Running Prisma migrations...');
  const schemaPath = join(__dirname, '../../prisma/schema.prisma');

  try {
    execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate`, {
      cwd: join(__dirname, '../..'),
      env: { ...process.env, DATABASE_URL: config.databaseUrl },
      stdio: 'pipe',
    });
    console.log('Database schema created successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }

  console.log(`PostgreSQL container started on port ${config.port}`);

  return config;
}

/**
 * Setup Testcontainers Redis for integration tests
 */
export async function setupTestRedis(): Promise<TestRedisConfig> {
  console.log('Starting Redis container...');

  redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  const config: TestRedisConfig = {
    host: redisContainer.getHost(),
    port: redisContainer.getMappedPort(6379),
    url: `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`,
  };

  // Set REDIS_URL for the application
  process.env.REDIS_URL = config.url;

  console.log(`Redis container started on port ${config.port}`);

  return config;
}

/**
 * Cleanup: Stop and remove the containers
 */
export async function teardownTestDatabase(): Promise<void> {
  if (pgContainer) {
    console.log('Stopping PostgreSQL container...');
    await pgContainer.stop();
    pgContainer = null;
  }
}

export async function teardownTestRedis(): Promise<void> {
  if (redisContainer) {
    console.log('Stopping Redis container...');
    await redisContainer.stop();
    redisContainer = null;
  }
}

/**
 * Get the current test database URL
 */
export function getTestDatabaseUrl(): string {
  return process.env.DATABASE_URL || '';
}

/**
 * Get the current test Redis URL
 */
export function getTestRedisUrl(): string {
  return process.env.REDIS_URL || '';
}

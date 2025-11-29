import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { join } from 'path';

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

  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('billing_service_test')
    .withUsername('test')
    .withPassword('test')
    .withExposedPorts(5432)
    .start();

  const config: TestDatabaseConfig = {
    databaseUrl: container.getConnectionUri(),
    host: container.getHost(),
    port: container.getMappedPort(5432),
    database: 'billing_service_test',
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
 * Cleanup: Stop and remove the container
 */
export async function teardownTestDatabase(): Promise<void> {
  if (container) {
    console.log('Stopping PostgreSQL container...');
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

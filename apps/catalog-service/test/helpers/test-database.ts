import { execSync } from 'child_process';

import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | null = null;
let prisma: PrismaClient | null = null;
let dockerAvailable: boolean | null = null;

export interface TestDatabaseConfig {
  databaseUrl: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export async function isDockerAvailable(): Promise<boolean> {
  if (dockerAvailable !== null) {
    return dockerAvailable;
  }

  try {
    execSync('docker info', { stdio: 'pipe' });
    dockerAvailable = true;
  } catch {
    dockerAvailable = false;
    console.warn(
      'Docker is not available. Integration tests requiring containers will be skipped.\n' +
        'To run full integration tests, please install Docker Desktop.'
    );
  }
  return dockerAvailable;
}

export async function startDatabase(): Promise<TestDatabaseConfig> {
  if (container) {
    throw new Error('Database container already started');
  }

  const hasDocker = await isDockerAvailable();
  if (!hasDocker) {
    throw new Error(
      'Docker is required for integration tests. Please install Docker Desktop and try again.'
    );
  }

  console.log('Starting PostgreSQL container...');

  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('catalog_test')
    .withUsername('test')
    .withPassword('test')
    .withExposedPorts(5432)
    .start();

  const config: TestDatabaseConfig = {
    databaseUrl: container.getConnectionUri(),
    host: container.getHost(),
    port: container.getMappedPort(5432),
    database: 'catalog_test',
    username: 'test',
    password: 'test',
  };

  process.env.DATABASE_URL = config.databaseUrl;

  console.log('Running Prisma migrations...');
  const schemaPath = require('path').join(__dirname, '../../prisma/schema.prisma');

  try {
    execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate`, {
      env: { ...process.env, DATABASE_URL: config.databaseUrl },
      stdio: 'pipe',
    });
    console.log('Database schema created successfully');
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }

  prisma = new PrismaClient({
    datasources: {
      db: { url: config.databaseUrl },
    },
  });

  await prisma.$connect();

  console.log(`PostgreSQL container started on port ${config.port}`);

  return config;
}

export async function cleanDatabase(): Promise<void> {
  if (!prisma) {
    throw new Error('Database not started');
  }

  await prisma.$transaction([
    prisma.couponRedemption.deleteMany(),
    prisma.couponUser.deleteMany(),
    prisma.couponPlan.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.vpsPlanImage.deleteMany(),
    prisma.vpsImage.deleteMany(),
    prisma.planPromo.deleteMany(),
    prisma.planPricing.deleteMany(),
    prisma.vpsPlan.deleteMany(),
  ]);
}

export async function stopDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }

  if (container) {
    console.log('Stopping PostgreSQL container...');
    await container.stop();
    container = null;
  }
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not started. Call startDatabase() first.');
  }
  return prisma;
}

export function getDatabaseConfig(): TestDatabaseConfig | null {
  if (!container) {
    return null;
  }

  return {
    databaseUrl: container.getConnectionUri(),
    host: container.getHost(),
    port: container.getMappedPort(5432),
    database: 'catalog_test',
    username: 'test',
    password: 'test',
  };
}

export function describeWithDocker(name: string, fn: () => void): void {
  if (dockerAvailable === false) {
    describe.skip(`${name} (requires Docker)`, fn);
  } else {
    describe(name, fn);
  }
}

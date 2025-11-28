import { GenericContainer, StartedTestContainer } from 'testcontainers';

let container: StartedTestContainer | null = null;

export interface TestRedisConfig {
  host: string;
  port: number;
  url: string;
}

export async function startRedis(): Promise<TestRedisConfig> {
  if (container) {
    throw new Error('Redis container already started');
  }

  console.log('Starting Redis container...');

  container = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  const config: TestRedisConfig = {
    host: container.getHost(),
    port: container.getMappedPort(6379),
    url: `redis://${container.getHost()}:${container.getMappedPort(6379)}`,
  };

  // Set REDIS_URL for rate limiting
  process.env.REDIS_URL = config.url;

  console.log(`Redis container started on port ${config.port}`);

  return config;
}

export async function flushRedis(): Promise<void> {
  // For now, we'll just note that Redis flush would be done here
  // When we implement rate limiting, we'll add the actual Redis client flush
  console.log('Redis flush called (no-op for now)');
}

export async function stopRedis(): Promise<void> {
  if (container) {
    console.log('Stopping Redis container...');
    await container.stop();
    container = null;
  }
}

export function getRedisConfig(): TestRedisConfig | null {
  if (!container) {
    return null;
  }

  return {
    host: container.getHost(),
    port: container.getMappedPort(6379),
    url: `redis://${container.getHost()}:${container.getMappedPort(6379)}`,
  };
}

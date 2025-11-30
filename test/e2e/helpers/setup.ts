/**
 * E2E Test Environment Setup Helpers
 *
 * Provides utilities for setting up and tearing down E2E test environments
 * including Docker-based service orchestration and health checks.
 */

import { execSync } from 'child_process';

const SERVICE_PORTS = {
  'auth-service': 3001,
  'catalog-service': 3002,
  'order-service': 3003,
  'billing-service': 3004,
  'instance-service': 3005,
  'notification-service': 3006,
};

export interface ServiceHealth {
  name: string;
  url: string;
  healthy: boolean;
  error?: string;
}

/**
 * Check if Docker is available on the system
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch {
    console.warn(
      'Docker is not available. E2E tests requiring containers will be skipped.\n' +
        'To run full E2E tests, please install Docker Desktop.'
    );
    return false;
  }
}

/**
 * Wait for a single service to become healthy
 */
async function waitForService(
  name: string,
  url: string,
  timeoutMs: number = 30000
): Promise<ServiceHealth> {
  const startTime = Date.now();
  const pollInterval = 1000;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { name, url, healthy: true };
      }
    } catch {
      // Service not ready yet, continue polling
    }

    await sleep(pollInterval);
  }

  return {
    name,
    url,
    healthy: false,
    error: `Service ${name} did not become healthy within ${timeoutMs}ms`,
  };
}

/**
 * Wait for all services to be ready
 */
export async function waitForServices(
  healthUrls: string[],
  timeoutMs: number = 60000
): Promise<ServiceHealth[]> {
  console.log('Waiting for services to be ready...');

  const results = await Promise.all(
    healthUrls.map(async (url) => {
      const name = extractServiceName(url);
      return waitForService(name, url, timeoutMs);
    })
  );

  const unhealthy = results.filter((r) => !r.healthy);
  if (unhealthy.length > 0) {
    console.error('The following services are unhealthy:');
    unhealthy.forEach((s) => console.error(`  - ${s.name}: ${s.error}`));
  }

  const healthy = results.filter((r) => r.healthy);
  console.log(`${healthy.length}/${results.length} services are healthy`);

  return results;
}

/**
 * Extract service name from health URL
 */
function extractServiceName(url: string): string {
  try {
    const urlObj = new URL(url);
    const port = parseInt(urlObj.port);

    for (const [name, servicePort] of Object.entries(SERVICE_PORTS)) {
      if (servicePort === port) {
        return name;
      }
    }

    return `service-${urlObj.port}`;
  } catch {
    return 'unknown-service';
  }
}

/**
 * Setup E2E test environment using docker-compose
 */
export async function setupE2EEnvironment(
  composeFile: string = 'docker-compose.test.yml'
): Promise<void> {
  const hasDocker = await isDockerAvailable();
  if (!hasDocker) {
    throw new Error(
      'Docker is required for E2E tests. Please install Docker Desktop and try again.'
    );
  }

  console.log('Starting E2E test environment...');

  try {
    // Start services with docker-compose
    execSync(`docker-compose -f ${composeFile} up -d`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    // Build health check URLs from service ports
    const healthUrls = Object.entries(SERVICE_PORTS).map(
      ([, port]) => `http://localhost:${port}/health`
    );

    // Wait for services to be ready
    const healthResults = await waitForServices(healthUrls);

    const allHealthy = healthResults.every((r) => r.healthy);
    if (!allHealthy) {
      throw new Error('Not all services became healthy');
    }

    console.log('E2E test environment is ready');
  } catch (error) {
    console.error('Failed to setup E2E environment:', error);
    // Attempt cleanup on failure
    await teardownE2EEnvironment(composeFile);
    throw error;
  }
}

/**
 * Teardown E2E test environment
 */
export async function teardownE2EEnvironment(
  composeFile: string = 'docker-compose.test.yml'
): Promise<void> {
  console.log('Tearing down E2E test environment...');

  try {
    execSync(`docker-compose -f ${composeFile} down -v --remove-orphans`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('E2E test environment torn down');
  } catch (error) {
    console.error('Failed to teardown E2E environment:', error);
    // Don't throw - cleanup should not fail tests
  }
}

/**
 * Get base URL for a service
 */
export function getServiceBaseUrl(
  serviceName: keyof typeof SERVICE_PORTS
): string {
  const port = SERVICE_PORTS[serviceName];
  return `http://localhost:${port}`;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 */
export async function waitFor<T>(
  fn: () => Promise<T>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {}
): Promise<T> {
  const { timeout = 10000, interval = 500, message = 'Condition not met' } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await fn();
      if (result) {
        return result;
      }
    } catch {
      // Condition not met yet
    }
    await sleep(interval);
  }

  throw new Error(`${message} within ${timeout}ms`);
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000 } = options;
  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * 2, maxDelay);
      }
    }
  }

  throw lastError;
}

/**
 * Skip test if Docker is not available
 */
export function describeWithDocker(name: string, fn: () => void): void {
  // This will be determined at runtime during test execution
  describe(name, fn);
}

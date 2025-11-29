import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Custom metrics
const rateLimitedRequests = new Counter('rate_limited_requests');
const requestsBeforeLimit = new Counter('requests_before_limit');
const successfulRequests = new Counter('successful_requests');
const rateLimitTriggered = new Rate('rate_limit_triggered');

export const options = {
  // Single VU to test rate limiting per user/IP
  scenarios: {
    login_rate_limit: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 20,
      maxDuration: '2m',
      tags: { scenario: 'login_rate_limit' },
    },
    api_rate_limit: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 100,
      maxDuration: '5m',
      startTime: '2m30s',
      tags: { scenario: 'api_rate_limit' },
    },
    burst_test: {
      executor: 'constant-arrival-rate',
      rate: 50, // 50 requests per second
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      maxVUs: 20,
      startTime: '8m',
      tags: { scenario: 'burst_test' },
    },
  },
  thresholds: {
    // Rate limiting should kick in
    rate_limited_requests: ['count>0'],
    // But not block everything
    successful_requests: ['count>10'],
  },
  tags: {
    testType: 'rate_limit',
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3001';

// Test data for failed logins (to trigger rate limiting)
const INVALID_CREDENTIALS = {
  email: 'ratelimit@example.com',
  password: 'wrongpassword',
};

export default function () {
  const scenario = __ENV.scenario || exec.scenario.name;

  switch (scenario) {
    case 'login_rate_limit':
      testLoginRateLimit();
      break;
    case 'api_rate_limit':
      testApiRateLimit();
      break;
    case 'burst_test':
      testBurstRateLimit();
      break;
    default:
      testLoginRateLimit();
  }
}

function testLoginRateLimit() {
  const iteration = __ITER;

  const res = http.post(
    `${AUTH_URL}/api/v1/auth/login`,
    JSON.stringify(INVALID_CREDENTIALS),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login_attempt' },
    }
  );

  // First few requests should fail with 401 (invalid credentials)
  // After rate limit, should get 429
  if (res.status === 429) {
    rateLimitedRequests.add(1);
    rateLimitTriggered.add(true);

    const hasRetryAfter = check(res, {
      'rate limited response': (r) => r.status === 429,
      'has Retry-After header': (r) => {
        return (
          r.headers['Retry-After'] !== undefined ||
          r.headers['retry-after'] !== undefined ||
          r.headers['X-RateLimit-Reset'] !== undefined ||
          r.headers['x-ratelimit-reset'] !== undefined
        );
      },
      'has rate limit message': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (
            body.message?.toLowerCase().includes('rate') ||
            body.error?.toLowerCase().includes('rate') ||
            body.message?.toLowerCase().includes('too many')
          );
        } catch {
          return r.body.toLowerCase().includes('rate');
        }
      },
    });

    console.log(`Iteration ${iteration}: Rate limited (429)`);
    if (res.headers['Retry-After'] || res.headers['retry-after']) {
      console.log(`  Retry-After: ${res.headers['Retry-After'] || res.headers['retry-after']}`);
    }
  } else if (res.status === 401) {
    // Expected for invalid credentials before rate limit
    requestsBeforeLimit.add(1);
    successfulRequests.add(1);
    rateLimitTriggered.add(false);
    console.log(`Iteration ${iteration}: Auth failed (401) - not rate limited yet`);
  } else {
    console.log(`Iteration ${iteration}: Unexpected status ${res.status}`);
    rateLimitTriggered.add(false);
  }

  // No sleep - we want to trigger rate limiting
}

function testApiRateLimit() {
  // First, get a valid token
  const loginRes = http.post(
    `${AUTH_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: __ENV.TEST_USER_EMAIL || 'apitest@example.com',
      password: __ENV.TEST_USER_PASSWORD || 'ApiTest123!',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'api_login' },
    }
  );

  let token = 'test-token';
  if (loginRes.status === 200 || loginRes.status === 201) {
    const body = JSON.parse(loginRes.body);
    token = body.data?.accessToken || body.accessToken || token;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Rapid-fire API requests
  const res = http.get(`${BASE_URL}/api/v1/orders`, {
    headers,
    tags: { name: 'api_orders' },
  });

  if (res.status === 429) {
    rateLimitedRequests.add(1);
    rateLimitTriggered.add(true);

    check(res, {
      'API rate limited': (r) => r.status === 429,
      'has rate limit headers': (r) => {
        return (
          r.headers['X-RateLimit-Limit'] !== undefined ||
          r.headers['x-ratelimit-limit'] !== undefined ||
          r.headers['X-RateLimit-Remaining'] !== undefined ||
          r.headers['x-ratelimit-remaining'] !== undefined
        );
      },
    });
  } else if (res.status === 200) {
    successfulRequests.add(1);
    rateLimitTriggered.add(false);

    // Check for rate limit headers even on success
    check(res, {
      'successful response': (r) => r.status === 200,
      'has rate limit info': (r) => {
        return (
          r.headers['X-RateLimit-Remaining'] !== undefined ||
          r.headers['x-ratelimit-remaining'] !== undefined
        );
      },
    });

    const remaining =
      res.headers['X-RateLimit-Remaining'] || res.headers['x-ratelimit-remaining'];
    if (remaining !== undefined) {
      console.log(`Iteration ${__ITER}: Remaining requests: ${remaining}`);
    }
  }

  // Minimal sleep to test rate limits
  sleep(0.05);
}

function testBurstRateLimit() {
  // Simulate a burst of requests
  const headers = {
    'Content-Type': 'application/json',
  };

  // Public endpoint that should have rate limiting
  const res = http.get(`${BASE_URL}/api/v1/health`, {
    headers,
    tags: { name: 'health_check' },
  });

  if (res.status === 429) {
    rateLimitedRequests.add(1);
    rateLimitTriggered.add(true);
  } else if (res.status === 200) {
    successfulRequests.add(1);
    rateLimitTriggered.add(false);
  }
}

export function handleSummary(data) {
  const summary = generateRateLimitSummary(data);

  return {
    'rate-limit-test-summary.json': JSON.stringify(data, null, 2),
    'rate-limit-test-report.txt': summary,
    stdout: summary,
  };
}

function generateRateLimitSummary(data) {
  const lines = [];

  lines.push('');
  lines.push('='.repeat(70));
  lines.push('RATE LIMIT TEST REPORT');
  lines.push('='.repeat(70));
  lines.push('');

  lines.push('Test Scenarios:');
  lines.push('-'.repeat(40));
  lines.push('  1. Login Rate Limit: 20 rapid login attempts');
  lines.push('  2. API Rate Limit: 100 rapid API requests');
  lines.push('  3. Burst Test: 50 req/s for 30 seconds');
  lines.push('');

  if (data.metrics) {
    lines.push('Results:');
    lines.push('-'.repeat(40));

    const rateLimited = data.metrics.rate_limited_requests?.values.count || 0;
    const successful = data.metrics.successful_requests?.values.count || 0;
    const beforeLimit = data.metrics.requests_before_limit?.values.count || 0;

    lines.push(`  Successful Requests: ${successful}`);
    lines.push(`  Requests Before Limit: ${beforeLimit}`);
    lines.push(`  Rate Limited (429): ${rateLimited}`);
    lines.push('');

    // Rate limiting effectiveness
    lines.push('Rate Limiting Assessment:');
    lines.push('-'.repeat(40));

    if (rateLimited > 0) {
      lines.push('  ✅ Rate limiting is ACTIVE');
      lines.push(`  Triggered after ~${beforeLimit} requests`);

      if (beforeLimit > 0 && beforeLimit <= 10) {
        lines.push('  Rate limit threshold appears appropriate');
      } else if (beforeLimit > 10) {
        lines.push('  ⚠️ Rate limit threshold may be too high');
      }
    } else {
      lines.push('  ⚠️ Rate limiting NOT triggered');
      lines.push('  Either disabled or threshold is very high');
    }

    // Response headers check
    lines.push('');
    lines.push('Headers Analysis:');
    lines.push('-'.repeat(40));
    lines.push('  Check test output for rate limit headers:');
    lines.push('  - X-RateLimit-Limit');
    lines.push('  - X-RateLimit-Remaining');
    lines.push('  - X-RateLimit-Reset');
    lines.push('  - Retry-After');
  }

  // Thresholds
  lines.push('');
  lines.push('Threshold Results:');
  lines.push('-'.repeat(40));

  if (data.thresholds) {
    Object.keys(data.thresholds).forEach((key) => {
      const threshold = data.thresholds[key];
      const status = threshold.ok ? '✅ PASS' : '❌ FAIL';
      lines.push(`  ${key}: ${status}`);
    });
  }

  lines.push('');
  lines.push('Recommendations:');
  lines.push('-'.repeat(40));
  lines.push('  1. Ensure rate limits are configured for all endpoints');
  lines.push('  2. Login endpoints should have stricter limits');
  lines.push('  3. Return proper 429 status with Retry-After header');
  lines.push('  4. Consider different limits for authenticated vs anonymous');
  lines.push('');
  lines.push('='.repeat(70));

  return lines.join('\n');
}

// Import exec for scenario detection
import exec from 'k6/execution';

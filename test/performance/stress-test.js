import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to normal load
    { duration: '5m', target: 100 },   // Normal load
    { duration: '2m', target: 200 },   // Push to stress
    { duration: '5m', target: 200 },   // Stay at stress
    { duration: '2m', target: 300 },   // Breaking point exploration
    { duration: '5m', target: 300 },   // Stay at breaking point
    { duration: '2m', target: 400 },   // Extreme stress
    { duration: '3m', target: 400 },   // Stay at extreme
    { duration: '5m', target: 0 },     // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'],  // 99% under 2s during stress
    http_req_failed: ['rate<0.1'],       // Less than 10% failures
    errors: ['rate<0.15'],               // Allow higher error rate during stress
  },
  tags: {
    testType: 'stress',
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const CATALOG_URL = __ENV.CATALOG_URL || 'http://localhost:3002';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3001';
const INSTANCE_URL = __ENV.INSTANCE_URL || 'http://localhost:3005';

// Test data
const TEST_USER = {
  email: __ENV.TEST_USER_EMAIL || 'stresstest@example.com',
  password: __ENV.TEST_USER_PASSWORD || 'StressTest123!',
};

export function setup() {
  console.log('Starting stress test - finding system breaking point');
  console.log(`Target URLs:`);
  console.log(`  - Base: ${BASE_URL}`);
  console.log(`  - Catalog: ${CATALOG_URL}`);
  console.log(`  - Auth: ${AUTH_URL}`);
  console.log(`  - Instance: ${INSTANCE_URL}`);

  const loginRes = http.post(
    `${AUTH_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    }
  );

  if (loginRes.status !== 200 && loginRes.status !== 201) {
    console.error(`Login failed: ${loginRes.status}`);
    return { token: 'test-token', authenticated: false };
  }

  const body = JSON.parse(loginRes.body);
  const token = body.data?.accessToken || body.accessToken;

  return { token, authenticated: true };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  group('Mixed Workload', function () {
    // Execute multiple concurrent requests to stress the system
    const responses = http.batch([
      {
        method: 'GET',
        url: `${CATALOG_URL}/api/v1/catalog/plans`,
        params: { headers, tags: { name: 'batch_catalog_plans' } },
      },
      {
        method: 'GET',
        url: `${BASE_URL}/api/v1/orders`,
        params: { headers, tags: { name: 'batch_orders' } },
      },
      {
        method: 'GET',
        url: `${INSTANCE_URL}/api/v1/instances`,
        params: { headers, tags: { name: 'batch_instances' } },
      },
    ]);

    responses.forEach((res, i) => {
      const success = check(res, {
        [`batch request ${i} successful`]: (r) => r.status === 200,
        [`batch request ${i} response time ok`]: (r) => r.timings.duration < 3000,
      });

      if (success) {
        successfulRequests.add(1);
      } else {
        failedRequests.add(1);
        console.log(`Batch request ${i} failed: ${res.status}`);
      }

      errorRate.add(!success);
      requestDuration.add(res.timings.duration);
    });
  });

  // Heavy operations - test database and service load
  group('Heavy Operations', function () {
    // Query with filters - stresses database
    const filteredOrdersRes = http.get(
      `${BASE_URL}/api/v1/orders?limit=50&status=PENDING_PAYMENT`,
      {
        headers,
        tags: { name: 'filtered_orders' },
      }
    );

    check(filteredOrdersRes, {
      'filtered orders successful': (r) => r.status === 200,
    });
    errorRate.add(filteredOrdersRes.status !== 200);

    // Get catalog with all options
    const fullCatalogRes = http.get(
      `${CATALOG_URL}/api/v1/catalog/plans?includeInactive=false`,
      {
        headers,
        tags: { name: 'full_catalog' },
      }
    );

    check(fullCatalogRes, {
      'full catalog successful': (r) => r.status === 200,
    });
    errorRate.add(fullCatalogRes.status !== 200);
  });

  // Minimal sleep to maximize stress
  sleep(0.3 + Math.random() * 0.4); // 0.3-0.7 seconds
}

export function teardown(data) {
  console.log('');
  console.log('='.repeat(60));
  console.log('STRESS TEST COMPLETED');
  console.log('='.repeat(60));
  console.log(`Authenticated: ${data.authenticated}`);
  console.log('Check the results to identify the system breaking point');
}

export function handleSummary(data) {
  const summary = generateStressSummary(data);

  return {
    'stress-test-summary.json': JSON.stringify(data, null, 2),
    'stress-test-report.txt': summary,
    stdout: summary,
  };
}

function generateStressSummary(data) {
  const lines = [];

  lines.push('');
  lines.push('='.repeat(70));
  lines.push('STRESS TEST REPORT');
  lines.push('='.repeat(70));
  lines.push('');

  // Test configuration
  lines.push('Test Configuration:');
  lines.push('-'.repeat(40));
  lines.push(`  Peak VUs: ${options.stages.reduce((max, s) => Math.max(max, s.target), 0)}`);
  lines.push(`  Total Duration: ${getTotalDuration(options.stages)}`);
  lines.push('');

  // Results
  if (data.metrics) {
    lines.push('Results:');
    lines.push('-'.repeat(40));

    // Request metrics
    if (data.metrics.http_reqs) {
      lines.push(`  Total Requests: ${data.metrics.http_reqs.values.count || 0}`);
      lines.push(`  Requests/sec: ${data.metrics.http_reqs.values.rate?.toFixed(2) || 0}`);
    }

    // Duration metrics
    if (data.metrics.http_req_duration) {
      const dur = data.metrics.http_req_duration.values;
      lines.push('');
      lines.push('  Response Times:');
      lines.push(`    Average: ${dur.avg?.toFixed(2) || 'N/A'}ms`);
      lines.push(`    p95: ${dur['p(95)']?.toFixed(2) || 'N/A'}ms`);
      lines.push(`    p99: ${dur['p(99)']?.toFixed(2) || 'N/A'}ms`);
      lines.push(`    Max: ${dur.max?.toFixed(2) || 'N/A'}ms`);
    }

    // Error metrics
    if (data.metrics.http_req_failed) {
      const failRate = data.metrics.http_req_failed.values.rate || 0;
      lines.push('');
      lines.push(`  Failure Rate: ${(failRate * 100).toFixed(2)}%`);
    }

    // Breaking point analysis
    lines.push('');
    lines.push('Breaking Point Analysis:');
    lines.push('-'.repeat(40));

    const p99 = data.metrics.http_req_duration?.values['p(99)'] || 0;
    const failRate = data.metrics.http_req_failed?.values.rate || 0;

    if (p99 < 500 && failRate < 0.01) {
      lines.push('  System handled stress well - consider higher load');
    } else if (p99 < 1000 && failRate < 0.05) {
      lines.push('  System showing signs of stress - approaching limits');
    } else if (p99 < 2000 && failRate < 0.1) {
      lines.push('  System at stress limit - degraded performance');
    } else {
      lines.push('  System exceeded capacity - breaking point reached');
    }
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
  lines.push('='.repeat(70));

  return lines.join('\n');
}

function getTotalDuration(stages) {
  let totalSeconds = 0;
  stages.forEach((stage) => {
    const match = stage.duration.match(/(\d+)([smh])/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
        case 's':
          totalSeconds += value;
          break;
        case 'm':
          totalSeconds += value * 60;
          break;
        case 'h':
          totalSeconds += value * 3600;
          break;
      }
    }
  });
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
}

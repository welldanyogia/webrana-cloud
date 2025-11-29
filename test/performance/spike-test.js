import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const spikeRecoveryTime = new Trend('spike_recovery_time');
const responseDuringSpike = new Trend('response_during_spike');
const responseDuringNormal = new Trend('response_during_normal');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // Normal load baseline
    { duration: '10s', target: 500 },  // SPIKE! Sudden 10x increase
    { duration: '3m', target: 500 },   // Stay at spike level
    { duration: '10s', target: 50 },   // Back to normal
    { duration: '3m', target: 50 },    // Recovery period
    { duration: '10s', target: 300 },  // Second spike
    { duration: '2m', target: 300 },   // Stay at second spike
    { duration: '10s', target: 50 },   // Back to normal
    { duration: '2m', target: 50 },    // Final recovery
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // During spikes, we expect degradation but should recover
    http_req_duration: ['p(95)<3000'],    // 95% under 3s even during spike
    http_req_failed: ['rate<0.2'],         // Allow up to 20% failures during spike
    errors: ['rate<0.25'],                 // Overall error rate
    response_during_normal: ['p(95)<500'], // Normal traffic should stay fast
  },
  tags: {
    testType: 'spike',
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const CATALOG_URL = __ENV.CATALOG_URL || 'http://localhost:3002';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3001';

// Test data
const TEST_USER = {
  email: __ENV.TEST_USER_EMAIL || 'spiketest@example.com',
  password: __ENV.TEST_USER_PASSWORD || 'SpikeTest123!',
};

// Track spike phases
let currentPhase = 'normal';
let spikeStartTime = 0;
let recoveryStartTime = 0;

export function setup() {
  console.log('Starting spike test - testing sudden traffic surges');
  console.log(`Spike pattern: 50 → 500 → 50 → 300 → 50`);

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

  return { token, authenticated: true, startTime: Date.now() };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // Determine current phase based on VU count
  const vuCount = __VU || 1;
  const isSpike = vuCount > 100;

  group('Catalog Operations', function () {
    const start = Date.now();

    const plansRes = http.get(`${CATALOG_URL}/api/v1/catalog/plans`, {
      headers,
      tags: { name: 'catalog_plans', phase: isSpike ? 'spike' : 'normal' },
    });

    const duration = Date.now() - start;

    const success = check(plansRes, {
      'catalog response ok': (r) => r.status === 200,
      'catalog response time acceptable': (r) => r.timings.duration < 5000,
    });

    // Track metrics by phase
    if (isSpike) {
      responseDuringSpike.add(duration);
    } else {
      responseDuringNormal.add(duration);
    }

    if (success) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
    errorRate.add(!success);
  });

  group('Order Operations', function () {
    const ordersRes = http.get(`${BASE_URL}/api/v1/orders`, {
      headers,
      tags: { name: 'orders_list', phase: isSpike ? 'spike' : 'normal' },
    });

    const success = check(ordersRes, {
      'orders response ok': (r) => r.status === 200,
    });

    if (success) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }
    errorRate.add(!success);
  });

  // Occasional write operations even during spike
  if (Math.random() < 0.05) {
    // 5% write operations
    group('Order Creation During Spike', function () {
      const hostname = `spike-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const orderRes = http.post(
        `${BASE_URL}/api/v1/orders`,
        JSON.stringify({
          planId: __ENV.TEST_PLAN_ID || 'plan-basic',
          imageId: __ENV.TEST_IMAGE_ID || 'ubuntu-22-04',
          hostname: hostname,
          duration: 1,
        }),
        {
          headers,
          tags: { name: 'order_create_spike', phase: isSpike ? 'spike' : 'normal' },
        }
      );

      check(orderRes, {
        'order creation successful': (r) => r.status === 201,
      });
    });
  }

  // Very short sleep during spikes to maximize pressure
  if (isSpike) {
    sleep(0.1 + Math.random() * 0.2); // 0.1-0.3 seconds
  } else {
    sleep(0.5 + Math.random() * 1); // 0.5-1.5 seconds
  }
}

export function teardown(data) {
  const totalDuration = Date.now() - data.startTime;
  console.log('');
  console.log('='.repeat(60));
  console.log('SPIKE TEST COMPLETED');
  console.log('='.repeat(60));
  console.log(`Total test duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log('Analyze spike response and recovery metrics below');
}

export function handleSummary(data) {
  const summary = generateSpikeSummary(data);

  return {
    'spike-test-summary.json': JSON.stringify(data, null, 2),
    'spike-test-report.txt': summary,
    stdout: summary,
  };
}

function generateSpikeSummary(data) {
  const lines = [];

  lines.push('');
  lines.push('='.repeat(70));
  lines.push('SPIKE TEST REPORT');
  lines.push('='.repeat(70));
  lines.push('');

  // Test pattern
  lines.push('Spike Pattern:');
  lines.push('-'.repeat(40));
  lines.push('  Baseline: 50 VUs');
  lines.push('  Spike 1: 500 VUs (10x increase)');
  lines.push('  Spike 2: 300 VUs (6x increase)');
  lines.push('');

  if (data.metrics) {
    // Overall performance
    lines.push('Overall Performance:');
    lines.push('-'.repeat(40));

    if (data.metrics.http_reqs) {
      lines.push(`  Total Requests: ${data.metrics.http_reqs.values.count || 0}`);
      lines.push(`  Peak Throughput: ${data.metrics.http_reqs.values.rate?.toFixed(2) || 0} req/s`);
    }

    // Response time comparison
    lines.push('');
    lines.push('Response Time Analysis:');
    lines.push('-'.repeat(40));

    if (data.metrics.response_during_normal) {
      const normal = data.metrics.response_during_normal.values;
      lines.push('  During Normal Load:');
      lines.push(`    Average: ${normal.avg?.toFixed(2) || 'N/A'}ms`);
      lines.push(`    p95: ${normal['p(95)']?.toFixed(2) || 'N/A'}ms`);
    }

    if (data.metrics.response_during_spike) {
      const spike = data.metrics.response_during_spike.values;
      lines.push('  During Spike:');
      lines.push(`    Average: ${spike.avg?.toFixed(2) || 'N/A'}ms`);
      lines.push(`    p95: ${spike['p(95)']?.toFixed(2) || 'N/A'}ms`);
    }

    // Degradation calculation
    if (data.metrics.response_during_normal && data.metrics.response_during_spike) {
      const normalAvg = data.metrics.response_during_normal.values.avg || 0;
      const spikeAvg = data.metrics.response_during_spike.values.avg || 0;
      if (normalAvg > 0) {
        const degradation = ((spikeAvg - normalAvg) / normalAvg) * 100;
        lines.push('');
        lines.push(`  Performance Degradation: ${degradation.toFixed(1)}%`);
      }
    }

    // Error rates
    lines.push('');
    lines.push('Error Analysis:');
    lines.push('-'.repeat(40));

    if (data.metrics.http_req_failed) {
      const failRate = data.metrics.http_req_failed.values.rate || 0;
      lines.push(`  Failure Rate: ${(failRate * 100).toFixed(2)}%`);
    }

    // Recovery assessment
    lines.push('');
    lines.push('Recovery Assessment:');
    lines.push('-'.repeat(40));

    const p95 = data.metrics.http_req_duration?.values['p(95)'] || 0;
    const failRate = data.metrics.http_req_failed?.values.rate || 0;

    if (failRate < 0.05 && p95 < 1000) {
      lines.push('  ✅ System recovered well from spikes');
      lines.push('  Auto-scaling or queuing working effectively');
    } else if (failRate < 0.15 && p95 < 2000) {
      lines.push('  ⚠️ System showed stress but recovered');
      lines.push('  Consider improving capacity planning');
    } else {
      lines.push('  ❌ System struggled with spike recovery');
      lines.push('  Need to implement better spike handling');
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

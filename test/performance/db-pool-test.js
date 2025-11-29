import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const dbQueryDuration = new Trend('db_query_duration');
const connectionErrors = new Counter('connection_errors');
const timeoutErrors = new Counter('timeout_errors');
const successfulQueries = new Counter('successful_queries');
const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    // Sustained high concurrency to stress connection pool
    sustained_load: {
      executor: 'constant-vus',
      vus: 200,
      duration: '5m',
      tags: { scenario: 'sustained_load' },
    },
    // Ramping to find connection pool limits
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 400 },
        { duration: '1m', target: 200 },
        { duration: '1m', target: 0 },
      ],
      startTime: '6m',
      tags: { scenario: 'ramping_load' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],   // 95% under 1s
    http_req_failed: ['rate<0.05'],       // Less than 5% failures
    db_query_duration: ['p(95)<800'],     // DB queries under 800ms
    errors: ['rate<0.05'],                // Overall error rate
    connection_errors: ['count<10'],      // Very few connection errors
    timeout_errors: ['count<5'],          // Almost no timeouts
  },
  tags: {
    testType: 'db_pool',
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3001';
const BILLING_URL = __ENV.BILLING_URL || 'http://localhost:3004';

// Shared token (set in setup)
let authToken = null;

export function setup() {
  console.log('Starting database connection pool test');
  console.log(`Testing concurrent database connections under load`);
  console.log(`Peak VUs: 400`);
  console.log('');

  // Get auth token
  const loginRes = http.post(
    `${AUTH_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: __ENV.TEST_USER_EMAIL || 'dbtest@example.com',
      password: __ENV.TEST_USER_PASSWORD || 'DbTest123!',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  let token = 'test-token';
  if (loginRes.status === 200 || loginRes.status === 201) {
    const body = JSON.parse(loginRes.body);
    token = body.data?.accessToken || body.accessToken || token;
  }

  return { token, authenticated: loginRes.status === 200 || loginRes.status === 201 };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // Heavy database query - list orders with relations
  testOrdersWithRelations(headers);

  // Query with complex filtering
  testFilteredQuery(headers);

  // Aggregate query
  testAggregateQuery(headers);

  // Minimal sleep to maximize DB pressure
  sleep(0.1 + Math.random() * 0.2);
}

function testOrdersWithRelations(headers) {
  const start = Date.now();

  // Query that joins multiple tables
  const res = http.get(
    `${BASE_URL}/api/v1/orders?limit=100&include=invoice,tasks`,
    {
      headers,
      tags: { name: 'orders_with_relations' },
      timeout: '30s',
    }
  );

  const duration = Date.now() - start;
  dbQueryDuration.add(duration);

  const success = check(res, {
    'orders query successful': (r) => r.status === 200,
    'response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch {
        return false;
      }
    },
    'query time acceptable': (r) => r.timings.duration < 2000,
  });

  if (success) {
    successfulQueries.add(1);
    errorRate.add(false);
  } else {
    errorRate.add(true);

    // Categorize error type
    if (res.status === 0 || res.error) {
      connectionErrors.add(1);
      console.log(`Connection error: ${res.error}`);
    } else if (res.timings.duration >= 30000) {
      timeoutErrors.add(1);
      console.log(`Timeout on orders query`);
    }
  }
}

function testFilteredQuery(headers) {
  const start = Date.now();

  // Complex filtered query
  const statuses = ['PENDING_PAYMENT', 'PAID', 'PROVISIONING', 'ACTIVE'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

  const res = http.get(
    `${BASE_URL}/api/v1/orders?status=${randomStatus}&limit=50&sortBy=createdAt&sortOrder=desc`,
    {
      headers,
      tags: { name: 'filtered_orders' },
      timeout: '30s',
    }
  );

  const duration = Date.now() - start;
  dbQueryDuration.add(duration);

  const success = check(res, {
    'filtered query successful': (r) => r.status === 200,
  });

  if (success) {
    successfulQueries.add(1);
  }
  errorRate.add(!success);
}

function testAggregateQuery(headers) {
  const start = Date.now();

  // Query that might trigger aggregation
  const res = http.get(`${BILLING_URL}/api/v1/invoices?limit=50`, {
    headers,
    tags: { name: 'invoices_query' },
    timeout: '30s',
  });

  const duration = Date.now() - start;
  dbQueryDuration.add(duration);

  const success = check(res, {
    'invoices query successful': (r) => r.status === 200,
  });

  if (success) {
    successfulQueries.add(1);
  } else {
    if (res.status === 0 || res.error) {
      connectionErrors.add(1);
    }
  }
  errorRate.add(!success);
}

export function teardown(data) {
  console.log('');
  console.log('Database pool test completed');
  console.log(`Authenticated: ${data.authenticated}`);
}

export function handleSummary(data) {
  const summary = generateDbPoolSummary(data);

  return {
    'db-pool-test-summary.json': JSON.stringify(data, null, 2),
    'db-pool-test-report.txt': summary,
    stdout: summary,
  };
}

function generateDbPoolSummary(data) {
  const lines = [];

  lines.push('');
  lines.push('='.repeat(70));
  lines.push('DATABASE CONNECTION POOL TEST REPORT');
  lines.push('='.repeat(70));
  lines.push('');

  lines.push('Test Configuration:');
  lines.push('-'.repeat(40));
  lines.push('  Scenario 1: Sustained 200 VUs for 5 minutes');
  lines.push('  Scenario 2: Ramping 50 → 400 → 0 VUs over 9 minutes');
  lines.push('  Query Types: Orders with relations, filtered queries, invoices');
  lines.push('');

  if (data.metrics) {
    lines.push('Performance Results:');
    lines.push('-'.repeat(40));

    // Request metrics
    if (data.metrics.http_reqs) {
      lines.push(`  Total Queries: ${data.metrics.http_reqs.values.count || 0}`);
      lines.push(`  Queries/sec: ${data.metrics.http_reqs.values.rate?.toFixed(2) || 0}`);
    }

    // DB query duration
    if (data.metrics.db_query_duration) {
      const dur = data.metrics.db_query_duration.values;
      lines.push('');
      lines.push('  Database Query Duration:');
      lines.push(`    Average: ${dur.avg?.toFixed(2) || 'N/A'}ms`);
      lines.push(`    p95: ${dur['p(95)']?.toFixed(2) || 'N/A'}ms`);
      lines.push(`    p99: ${dur['p(99)']?.toFixed(2) || 'N/A'}ms`);
      lines.push(`    Max: ${dur.max?.toFixed(2) || 'N/A'}ms`);
    }

    // Error metrics
    lines.push('');
    lines.push('  Error Analysis:');

    const connErrors = data.metrics.connection_errors?.values.count || 0;
    const timeoutErrs = data.metrics.timeout_errors?.values.count || 0;
    const successfulQs = data.metrics.successful_queries?.values.count || 0;

    lines.push(`    Successful Queries: ${successfulQs}`);
    lines.push(`    Connection Errors: ${connErrors}`);
    lines.push(`    Timeout Errors: ${timeoutErrs}`);

    if (data.metrics.http_req_failed) {
      const failRate = data.metrics.http_req_failed.values.rate || 0;
      lines.push(`    Overall Failure Rate: ${(failRate * 100).toFixed(2)}%`);
    }

    // Connection pool assessment
    lines.push('');
    lines.push('Connection Pool Assessment:');
    lines.push('-'.repeat(40));

    const p95 = data.metrics.db_query_duration?.values['p(95)'] || 0;
    const failRate = data.metrics.http_req_failed?.values.rate || 0;

    if (connErrors === 0 && timeoutErrs === 0 && failRate < 0.01) {
      lines.push('  ✅ Connection pool handled load excellently');
      lines.push('  Pool size appears adequate for tested load');
    } else if (connErrors < 5 && timeoutErrs < 3 && failRate < 0.05) {
      lines.push('  ⚠️ Minor connection pool pressure detected');
      lines.push('  Consider increasing pool size for production');
    } else if (connErrors < 10 && failRate < 0.1) {
      lines.push('  ⚠️ Connection pool showing stress');
      lines.push('  Recommend increasing pool size');
      lines.push('  Current queries may be holding connections too long');
    } else {
      lines.push('  ❌ Connection pool exhausted under load');
      lines.push('  Immediate action required:');
      lines.push('    1. Increase connection pool size');
      lines.push('    2. Add connection timeout settings');
      lines.push('    3. Review query performance');
      lines.push('    4. Consider read replicas');
    }

    // Query performance
    lines.push('');
    lines.push('Query Performance:');
    lines.push('-'.repeat(40));

    if (p95 < 200) {
      lines.push('  ✅ Query performance is excellent');
    } else if (p95 < 500) {
      lines.push('  ✅ Query performance is good');
    } else if (p95 < 1000) {
      lines.push('  ⚠️ Query performance is acceptable');
      lines.push('  Consider adding database indexes');
    } else {
      lines.push('  ❌ Query performance needs improvement');
      lines.push('  Recommendations:');
      lines.push('    1. Add indexes on frequently queried columns');
      lines.push('    2. Review and optimize slow queries');
      lines.push('    3. Consider query caching');
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
  lines.push('Recommendations:');
  lines.push('-'.repeat(40));
  lines.push('  1. Monitor connection pool metrics in production');
  lines.push('  2. Set up alerts for pool exhaustion');
  lines.push('  3. Configure connection idle timeout');
  lines.push('  4. Consider PgBouncer for connection pooling');
  lines.push('');
  lines.push('='.repeat(70));

  return lines.join('\n');
}

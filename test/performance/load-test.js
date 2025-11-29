import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const orderCreateTrend = new Trend('order_create_duration');
const catalogBrowseTrend = new Trend('catalog_browse_duration');
const orderListTrend = new Trend('order_list_duration');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],     // 95% requests under 500ms
    errors: ['rate<0.01'],                 // Error rate under 1%
    order_create_duration: ['p(95)<1000'], // Order creation under 1s
    catalog_browse_duration: ['p(95)<300'], // Catalog browsing under 300ms
    order_list_duration: ['p(95)<400'],    // Order listing under 400ms
    http_req_failed: ['rate<0.01'],        // HTTP failures under 1%
  },
  // Tags for better organization in reports
  tags: {
    testType: 'load',
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const CATALOG_URL = __ENV.CATALOG_URL || 'http://localhost:3002';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3001';

// Test data
const TEST_USER = {
  email: __ENV.TEST_USER_EMAIL || 'loadtest@example.com',
  password: __ENV.TEST_USER_PASSWORD || 'LoadTest123!',
};

export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log(`Test user: ${TEST_USER.email}`);

  // Login and get token
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
    console.error(`Login failed: ${loginRes.status} - ${loginRes.body}`);
    // Return a dummy token for testing purposes if login fails
    return { token: 'test-token-for-development', authenticated: false };
  }

  const body = JSON.parse(loginRes.body);
  const token = body.data?.accessToken || body.accessToken;

  console.log('Login successful, token obtained');
  return { token, authenticated: true };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // Weighted scenario distribution
  const rand = Math.random();

  if (rand < 0.6) {
    // Scenario 1: Browse catalog (60% of traffic)
    group('Browse Catalog', function () {
      browseCatalog(headers);
    });
  } else if (rand < 0.9) {
    // Scenario 2: View orders (30% of traffic)
    group('View Orders', function () {
      viewOrders(headers);
    });
  } else {
    // Scenario 3: Create order (10% of traffic)
    group('Create Order', function () {
      createOrder(headers);
    });
  }

  // Simulate user think time
  sleep(Math.random() * 2 + 0.5); // Random sleep between 0.5-2.5 seconds
}

function browseCatalog(headers) {
  const start = Date.now();

  // Get available plans
  const plansRes = http.get(`${CATALOG_URL}/api/v1/catalog/plans`, {
    headers,
    tags: { name: 'catalog_plans' },
  });

  const plansSuccess = check(plansRes, {
    'catalog plans status 200': (r) => r.status === 200,
    'catalog has plans': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && Array.isArray(body.data) && body.data.length > 0;
      } catch {
        return false;
      }
    },
  });

  if (plansSuccess) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
  }
  errorRate.add(!plansSuccess);
  catalogBrowseTrend.add(Date.now() - start);

  // Get available images
  const imagesRes = http.get(`${CATALOG_URL}/api/v1/catalog/images`, {
    headers,
    tags: { name: 'catalog_images' },
  });

  check(imagesRes, {
    'catalog images status 200': (r) => r.status === 200,
  });
}

function viewOrders(headers) {
  const start = Date.now();

  const ordersRes = http.get(`${BASE_URL}/api/v1/orders`, {
    headers,
    tags: { name: 'orders_list' },
  });

  const ordersSuccess = check(ordersRes, {
    'orders status 200': (r) => r.status === 200,
    'orders response valid': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (ordersSuccess) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
  }
  errorRate.add(!ordersSuccess);
  orderListTrend.add(Date.now() - start);
}

function createOrder(headers) {
  const start = Date.now();

  // Create a unique hostname for each order
  const hostname = `loadtest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const orderPayload = {
    planId: __ENV.TEST_PLAN_ID || 'plan-basic',
    imageId: __ENV.TEST_IMAGE_ID || 'ubuntu-22-04',
    hostname: hostname,
    duration: 1,
    region: __ENV.TEST_REGION || 'sgp1',
  };

  const orderRes = http.post(
    `${BASE_URL}/api/v1/orders`,
    JSON.stringify(orderPayload),
    {
      headers,
      tags: { name: 'order_create' },
    }
  );

  const orderSuccess = check(orderRes, {
    'order created': (r) => r.status === 201,
    'order has id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.id;
      } catch {
        return false;
      }
    },
  });

  if (orderSuccess) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
    console.log(`Order creation failed: ${orderRes.status} - ${orderRes.body}`);
  }

  errorRate.add(!orderSuccess);
  orderCreateTrend.add(Date.now() - start);
}

export function teardown(data) {
  console.log('Load test completed');
  console.log(`Authenticated: ${data.authenticated}`);
  // Note: In a real scenario, you might want to clean up test orders
  // created during the test. This would require tracking order IDs
  // and making delete requests.
}

export function handleSummary(data) {
  return {
    'load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '  ';
  const lines = [];

  lines.push('');
  lines.push('='.repeat(60));
  lines.push('LOAD TEST SUMMARY');
  lines.push('='.repeat(60));
  lines.push('');

  // Metrics summary
  if (data.metrics) {
    lines.push('Key Metrics:');
    lines.push('-'.repeat(40));

    if (data.metrics.http_req_duration) {
      const dur = data.metrics.http_req_duration.values;
      lines.push(`${indent}HTTP Request Duration:`);
      lines.push(`${indent}${indent}avg: ${dur.avg?.toFixed(2) || 'N/A'}ms`);
      lines.push(`${indent}${indent}p95: ${dur['p(95)']?.toFixed(2) || 'N/A'}ms`);
      lines.push(`${indent}${indent}p99: ${dur['p(99)']?.toFixed(2) || 'N/A'}ms`);
    }

    if (data.metrics.http_reqs) {
      lines.push(`${indent}Total Requests: ${data.metrics.http_reqs.values.count || 0}`);
      lines.push(`${indent}Requests/sec: ${data.metrics.http_reqs.values.rate?.toFixed(2) || 0}`);
    }

    if (data.metrics.errors) {
      lines.push(`${indent}Error Rate: ${((data.metrics.errors.values.rate || 0) * 100).toFixed(2)}%`);
    }
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

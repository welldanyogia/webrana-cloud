import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { crypto } from 'k6/experimental/webcrypto';

// Custom metrics
const webhookProcessingTime = new Trend('webhook_processing_time');
const successfulWebhooks = new Counter('successful_webhooks');
const failedWebhooks = new Counter('failed_webhooks');
const duplicateWebhooks = new Counter('duplicate_webhooks');
const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    // Normal webhook throughput
    normal_throughput: {
      executor: 'constant-arrival-rate',
      rate: 10, // 10 webhooks per second
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 20,
      maxVUs: 50,
      tags: { scenario: 'normal_throughput' },
    },
    // High throughput stress test
    high_throughput: {
      executor: 'constant-arrival-rate',
      rate: 50, // 50 webhooks per second
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 100,
      maxVUs: 200,
      startTime: '2m30s',
      tags: { scenario: 'high_throughput' },
    },
    // Burst scenario (flash sale, promotional event)
    burst_webhooks: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      stages: [
        { duration: '30s', target: 5 },    // Normal
        { duration: '10s', target: 100 },  // Sudden burst
        { duration: '1m', target: 100 },   // Sustained burst
        { duration: '10s', target: 5 },    // Back to normal
        { duration: '30s', target: 5 },    // Recovery
      ],
      preAllocatedVUs: 150,
      maxVUs: 300,
      startTime: '6m',
      tags: { scenario: 'burst_webhooks' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],       // 95% under 500ms
    http_req_failed: ['rate<0.01'],          // Less than 1% failures
    webhook_processing_time: ['p(95)<500'],  // Webhook processing under 500ms
    errors: ['rate<0.02'],                   // Overall error rate under 2%
  },
  tags: {
    testType: 'webhook_throughput',
  },
};

// Environment configuration
const BILLING_URL = __ENV.BILLING_URL || 'http://localhost:3004';
const TRIPAY_PRIVATE_KEY = __ENV.TRIPAY_PRIVATE_KEY || 'test-private-key';

// Counter for unique references
let webhookCounter = 0;

export function setup() {
  console.log('Starting webhook throughput test');
  console.log(`Billing Service URL: ${BILLING_URL}`);
  console.log('');
  console.log('Test Scenarios:');
  console.log('  1. Normal: 10 webhooks/sec for 2 minutes');
  console.log('  2. High: 50 webhooks/sec for 3 minutes');
  console.log('  3. Burst: 5 → 100 → 5 webhooks/sec');
  console.log('');

  return {
    startTime: Date.now(),
    privateKey: TRIPAY_PRIVATE_KEY,
  };
}

export default function (data) {
  webhookCounter++;

  // Generate unique webhook payload
  const webhookPayload = generateWebhookPayload(webhookCounter);

  // Generate signature
  const signature = generateSignature(webhookPayload, data.privateKey);

  const start = Date.now();

  const res = http.post(
    `${BILLING_URL}/api/v1/webhooks/tripay`,
    JSON.stringify(webhookPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Callback-Signature': signature,
      },
      tags: { name: 'webhook_callback' },
      timeout: '30s',
    }
  );

  const processingTime = Date.now() - start;
  webhookProcessingTime.add(processingTime);

  // Check response
  const success = check(res, {
    'webhook accepted': (r) => r.status === 200 || r.status === 201,
    'processing time ok': (r) => r.timings.duration < 1000,
    'valid response': (r) => {
      try {
        // Accept empty response or JSON response
        if (r.body === '' || r.body === 'OK') return true;
        const body = JSON.parse(r.body);
        return body !== null;
      } catch {
        return r.status === 200;
      }
    },
  });

  if (success) {
    successfulWebhooks.add(1);
    errorRate.add(false);
  } else {
    failedWebhooks.add(1);
    errorRate.add(true);

    // Log failure details
    if (res.status === 409) {
      duplicateWebhooks.add(1);
      // Duplicates are expected in high-throughput scenarios
    } else if (res.status !== 200 && res.status !== 201) {
      console.log(
        `Webhook failed: ${res.status} - ${res.body?.substring(0, 100) || 'No body'}`
      );
    }
  }

  // Minimal sleep between webhooks
  sleep(0.01);
}

function generateWebhookPayload(counter) {
  const timestamp = Date.now();
  const reference = `T${timestamp}${counter}${Math.random().toString(36).substr(2, 6)}`;

  return {
    reference: reference,
    merchant_ref: `ORD-PERF-${timestamp}-${counter}`,
    payment_selection: 'BRIVA',
    payment_method: 'BRIVA',
    payment_name: 'BRI Virtual Account',
    customer_name: 'Performance Test User',
    customer_email: `perftest${counter}@example.com`,
    customer_phone: '081234567890',
    callback_url: `${BILLING_URL}/api/v1/webhooks/tripay`,
    return_url: 'https://example.com/orders',
    amount: 150000 + (counter % 100) * 1000, // Vary amounts
    fee_merchant: 4000,
    fee_customer: 0,
    total_fee: 4000,
    amount_received: 146000 + (counter % 100) * 1000,
    pay_code: `${Math.random().toString().substr(2, 16)}`,
    pay_url: null,
    checkout_url: `https://tripay.co.id/checkout/${reference}`,
    status: getRandomStatus(),
    paid_at: new Date().toISOString(),
    expired_time: Math.floor(Date.now() / 1000) + 86400,
    order_items: [
      {
        sku: 'VPS-BASIC',
        name: 'VPS Basic Plan - 1 Month',
        price: 150000 + (counter % 100) * 1000,
        quantity: 1,
        subtotal: 150000 + (counter % 100) * 1000,
        product_url: 'https://example.com/plans/basic',
        image_url: 'https://example.com/images/vps-basic.png',
      },
    ],
    instructions: [],
    qr_string: null,
    qr_url: null,
  };
}

function getRandomStatus() {
  // Most webhooks should be PAID for realistic testing
  const statuses = ['PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'EXPIRED', 'FAILED'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function generateSignature(payload, privateKey) {
  // In real k6, you would use proper HMAC
  // This is a simplified version for testing
  const jsonString = JSON.stringify(payload);

  // k6 doesn't have native HMAC, so we'll use a test signature
  // In production tests, use k6's crypto module or external library
  try {
    // Simple hash for testing - in real scenario use proper HMAC-SHA256
    let hash = 0;
    const combined = privateKey + jsonString;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  } catch {
    // Fallback test signature
    return 'test-signature-for-performance-testing';
  }
}

export function teardown(data) {
  const totalDuration = Date.now() - data.startTime;
  console.log('');
  console.log('Webhook throughput test completed');
  console.log(`Total duration: ${(totalDuration / 1000).toFixed(1)}s`);
}

export function handleSummary(data) {
  const summary = generateWebhookSummary(data);

  return {
    'webhook-throughput-summary.json': JSON.stringify(data, null, 2),
    'webhook-throughput-report.txt': summary,
    stdout: summary,
  };
}

function generateWebhookSummary(data) {
  const lines = [];

  lines.push('');
  lines.push('='.repeat(70));
  lines.push('WEBHOOK THROUGHPUT TEST REPORT');
  lines.push('='.repeat(70));
  lines.push('');

  lines.push('Test Scenarios:');
  lines.push('-'.repeat(40));
  lines.push('  1. Normal Throughput: 10 webhooks/sec for 2 min');
  lines.push('  2. High Throughput: 50 webhooks/sec for 3 min');
  lines.push('  3. Burst: 5 → 100 → 5 webhooks/sec');
  lines.push('');

  if (data.metrics) {
    lines.push('Throughput Results:');
    lines.push('-'.repeat(40));

    if (data.metrics.http_reqs) {
      const reqs = data.metrics.http_reqs.values;
      lines.push(`  Total Webhooks Processed: ${reqs.count || 0}`);
      lines.push(`  Average Throughput: ${reqs.rate?.toFixed(2) || 0} webhooks/sec`);
    }

    // Success/Failure metrics
    const successful = data.metrics.successful_webhooks?.values.count || 0;
    const failed = data.metrics.failed_webhooks?.values.count || 0;
    const duplicates = data.metrics.duplicate_webhooks?.values.count || 0;

    lines.push('');
    lines.push('  Processing Results:');
    lines.push(`    Successful: ${successful}`);
    lines.push(`    Failed: ${failed}`);
    lines.push(`    Duplicates Detected: ${duplicates}`);

    if (successful + failed > 0) {
      const successRate = (successful / (successful + failed)) * 100;
      lines.push(`    Success Rate: ${successRate.toFixed(2)}%`);
    }

    // Processing time
    if (data.metrics.webhook_processing_time) {
      const proc = data.metrics.webhook_processing_time.values;
      lines.push('');
      lines.push('  Processing Time:');
      lines.push(`    Average: ${proc.avg?.toFixed(2) || 'N/A'}ms`);
      lines.push(`    p95: ${proc['p(95)']?.toFixed(2) || 'N/A'}ms`);
      lines.push(`    p99: ${proc['p(99)']?.toFixed(2) || 'N/A'}ms`);
      lines.push(`    Max: ${proc.max?.toFixed(2) || 'N/A'}ms`);
    }

    // Capacity assessment
    lines.push('');
    lines.push('Capacity Assessment:');
    lines.push('-'.repeat(40));

    const throughput = data.metrics.http_reqs?.values.rate || 0;
    const p95 = data.metrics.webhook_processing_time?.values['p(95)'] || 0;
    const failRate = data.metrics.http_req_failed?.values.rate || 0;

    if (throughput >= 50 && failRate < 0.01 && p95 < 500) {
      lines.push('  ✅ Excellent webhook processing capacity');
      lines.push(`  System handles ${throughput.toFixed(0)} webhooks/sec with low latency`);
    } else if (throughput >= 30 && failRate < 0.05 && p95 < 1000) {
      lines.push('  ✅ Good webhook processing capacity');
      lines.push(`  System handles ${throughput.toFixed(0)} webhooks/sec`);
    } else if (throughput >= 10 && failRate < 0.1) {
      lines.push('  ⚠️ Moderate webhook processing capacity');
      lines.push('  Consider scaling for higher volume events');
    } else {
      lines.push('  ❌ Webhook processing needs improvement');
      lines.push('  Recommendations:');
      lines.push('    1. Add message queue (RabbitMQ/Redis)');
      lines.push('    2. Implement async processing');
      lines.push('    3. Scale horizontally');
    }

    // Idempotency check
    lines.push('');
    lines.push('Idempotency Check:');
    lines.push('-'.repeat(40));

    if (duplicates > 0) {
      lines.push(`  ✅ Duplicate detection working (${duplicates} caught)`);
    } else {
      lines.push('  ⚠️ No duplicates detected in test');
      lines.push('  Verify idempotency implementation manually');
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
  lines.push('Production Recommendations:');
  lines.push('-'.repeat(40));
  lines.push('  1. Use message queue for webhook processing');
  lines.push('  2. Implement idempotency keys with TTL');
  lines.push('  3. Set up webhook retry mechanism');
  lines.push('  4. Monitor webhook processing lag');
  lines.push('  5. Alert on high failure rates');
  lines.push('');
  lines.push('='.repeat(70));

  return lines.join('\n');
}

# Performance Tests

This directory contains k6 performance tests for the Webrana Cloud Platform. These tests help ensure the system can handle expected load, identify breaking points, and verify performance requirements.

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Ubuntu/Debian:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

### Setup Test Users

Before running tests, ensure test users exist in the database:

```sql
-- Create test users for performance testing
INSERT INTO users (email, password, name, role)
VALUES 
  ('loadtest@example.com', '$2b$10$...', 'Load Test User', 'user'),
  ('stresstest@example.com', '$2b$10$...', 'Stress Test User', 'user'),
  ('spiketest@example.com', '$2b$10$...', 'Spike Test User', 'user'),
  ('dbtest@example.com', '$2b$10$...', 'DB Test User', 'user'),
  ('apitest@example.com', '$2b$10$...', 'API Test User', 'user');
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Order service URL | `http://localhost:4000` |
| `AUTH_URL` | Auth service URL | `http://localhost:3001` |
| `CATALOG_URL` | Catalog service URL | `http://localhost:3002` |
| `BILLING_URL` | Billing service URL | `http://localhost:3004` |
| `INSTANCE_URL` | Instance service URL | `http://localhost:3005` |
| `TEST_USER_EMAIL` | Test user email | `loadtest@example.com` |
| `TEST_USER_PASSWORD` | Test user password | `LoadTest123!` |
| `TEST_PLAN_ID` | Plan ID for orders | `plan-basic` |
| `TEST_IMAGE_ID` | Image ID for orders | `ubuntu-22-04` |
| `TRIPAY_PRIVATE_KEY` | Tripay webhook key | `test-private-key` |

## Available Tests

### 1. Load Test (`load-test.js`)

Tests normal load conditions with realistic traffic patterns.

**Scenarios:**
- Browse catalog (60% of traffic)
- View orders (30% of traffic)
- Create orders (10% of traffic)

**Traffic Pattern:**
- Ramp up: 0 → 50 VUs (2 min)
- Sustain: 50 VUs (5 min)
- Ramp up: 50 → 100 VUs (2 min)
- Sustain: 100 VUs (5 min)
- Ramp down: 100 → 0 VUs (2 min)

**Thresholds:**
- p95 response time < 500ms
- Error rate < 1%
- Order creation p95 < 1000ms

```bash
BASE_URL=http://localhost:4000 k6 run load-test.js
```

### 2. Stress Test (`stress-test.js`)

Finds the system's breaking point by gradually increasing load beyond normal capacity.

**Traffic Pattern:**
- Normal load: 100 VUs (7 min)
- Stress: 200 VUs (7 min)
- Breaking point: 300 VUs (7 min)
- Extreme: 400 VUs (5 min)
- Recovery: 0 VUs (5 min)

**Thresholds:**
- p99 response time < 2000ms
- HTTP failures < 10%

```bash
BASE_URL=http://localhost:4000 k6 run stress-test.js
```

### 3. Spike Test (`spike-test.js`)

Tests sudden traffic spikes (10x normal load) and recovery.

**Traffic Pattern:**
- Baseline: 50 VUs
- Spike 1: 500 VUs (sudden 10x increase)
- Recovery
- Spike 2: 300 VUs
- Final recovery

**Thresholds:**
- p95 response time < 3000ms (allows degradation during spike)
- HTTP failures < 20%
- Normal traffic p95 < 500ms

```bash
BASE_URL=http://localhost:4000 k6 run spike-test.js
```

### 4. Rate Limit Test (`rate-limit-test.js`)

Verifies rate limiting is working correctly.

**Scenarios:**
- Login rate limiting (20 rapid attempts)
- API rate limiting (100 rapid requests)
- Burst testing (50 req/s for 30s)

**Verifies:**
- 429 responses are returned
- Retry-After headers present
- Rate limit headers (X-RateLimit-*)

```bash
BASE_URL=http://localhost:4000 k6 run rate-limit-test.js
```

### 5. Database Pool Test (`db-pool-test.js`)

Tests database connection pool under high concurrency.

**Scenarios:**
- Sustained 200 VUs for 5 minutes
- Ramping 50 → 400 VUs over 9 minutes

**Queries:**
- Orders with relations (heavy joins)
- Filtered queries
- Invoice aggregations

**Thresholds:**
- p95 response < 1000ms
- HTTP failures < 5%
- Connection errors < 10
- Timeout errors < 5

```bash
BASE_URL=http://localhost:4000 k6 run db-pool-test.js
```

### 6. Webhook Throughput Test (`webhook-throughput-test.js`)

Tests payment webhook processing capacity.

**Scenarios:**
- Normal: 10 webhooks/sec (2 min)
- High: 50 webhooks/sec (3 min)
- Burst: 5 → 100 → 5 webhooks/sec

**Thresholds:**
- p95 processing time < 500ms
- HTTP failures < 1%
- Error rate < 2%

```bash
BILLING_URL=http://localhost:3004 k6 run webhook-throughput-test.js
```

## Running Tests

### Basic Execution

```bash
# Load test
k6 run load-test.js

# With environment variables
BASE_URL=http://staging.webrana.com \
AUTH_URL=http://staging.webrana.com:3001 \
k6 run load-test.js
```

### With Output Formats

```bash
# JSON output
k6 run --out json=results.json load-test.js

# Cloud output (requires k6 Cloud account)
k6 cloud load-test.js

# Multiple outputs
k6 run --out json=results.json --out influxdb=http://localhost:8086/k6 load-test.js
```

### Using Docker

```bash
docker run -i grafana/k6 run - <load-test.js

# With environment variables
docker run -i \
  -e BASE_URL=http://host.docker.internal:4000 \
  grafana/k6 run - <load-test.js
```

### npm Scripts

```bash
# Run load test
npm run test:load

# Run stress test
npm run test:stress

# Run spike test
npm run test:spike

# Run all tests
npm run test:all
```

## Output and Reports

Each test generates:

1. **Console output**: Real-time metrics and summary
2. **JSON file**: `<test-name>-summary.json` with full metrics
3. **Text report**: `<test-name>-report.txt` with analysis

### Sample Output

```
==========================================================
LOAD TEST SUMMARY
==========================================================

Key Metrics:
----------------------------------------
  HTTP Request Duration:
    avg: 125.43ms
    p95: 234.56ms
    p99: 456.78ms
  Total Requests: 15234
  Requests/sec: 84.63
  Error Rate: 0.12%

==========================================================
```

## Performance Targets

| Metric | Target | Description |
|--------|--------|-------------|
| p95 Response Time | < 500ms | 95% of requests complete in under 500ms |
| p99 Response Time | < 1000ms | 99% of requests complete in under 1s |
| Error Rate | < 1% | Less than 1% of requests should fail |
| Throughput | > 100 req/s | System should handle 100+ requests per second |
| Concurrent Users | 200+ | Support 200+ simultaneous users |

## Troubleshooting

### Common Issues

**1. Connection Refused**
```
ERRO[0000] dial tcp 127.0.0.1:4000: connect: connection refused
```
Solution: Ensure services are running before tests.

**2. Authentication Failures**
```
Login failed: 401 - Invalid credentials
```
Solution: Create test users in database with correct passwords.

**3. High Error Rate**
- Check service logs for errors
- Verify database connections
- Check rate limiting configuration

**4. Slow Response Times**
- Check database query performance
- Monitor CPU/memory usage
- Review network latency

### Monitoring During Tests

```bash
# Watch service logs
docker-compose logs -f order-service

# Monitor resources
htop
docker stats

# Check database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run Performance Tests
  run: |
    k6 run --out json=results.json test/performance/load-test.js
    
- name: Check Thresholds
  run: |
    # Fail if any threshold was breached
    if grep -q '"ok":false' results.json; then
      echo "Performance thresholds breached!"
      exit 1
    fi
```

## Best Practices

1. **Run in staging first** - Never run stress tests in production without preparation
2. **Warm up the system** - Start with low load before ramping up
3. **Monitor everything** - Watch logs, metrics, and resources during tests
4. **Test regularly** - Include performance tests in CI/CD pipeline
5. **Establish baselines** - Track metrics over time to detect regressions
6. **Clean up test data** - Remove test orders after performance testing

## Further Reading

- [k6 Documentation](https://k6.io/docs/)
- [Load Testing Best Practices](https://k6.io/docs/testing-guides/api-load-testing/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
- [k6 Scenarios](https://k6.io/docs/using-k6/scenarios/)

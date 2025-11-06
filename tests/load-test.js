/**
 * k6 Load Testing Script for SMS Verification
 * Tests 100 concurrent users sending verification SMS
 *
 * Prerequisites:
 * - k6 installed (https://k6.io/docs/getting-started/installation/)
 * - NotifyHub running at https://ntf.uitdeitp.ro
 * - uitdeitp-app running (for API endpoints)
 *
 * Usage:
 *   k6 run tests/load-test.js
 *
 * Advanced:
 *   k6 run --vus 100 --duration 30s tests/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const smsSuccessRate = new Rate('sms_success_rate');
const smsDeliveryTime = new Trend('sms_delivery_time');
const apiResponseTime = new Trend('api_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Sustain 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests must complete below 500ms
    'http_req_failed': ['rate<0.01'],   // Error rate must be below 1%
    'sms_success_rate': ['rate>0.99'],  // SMS success rate must be above 99%
  },
};

// Base URLs (configure as needed)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const NOTIFYHUB_URL = __ENV.NOTIFYHUB_URL || 'https://ntf.uitdeitp.ro';

// Generate random Romanian phone number
function generatePhone() {
  const prefixes = ['070', '071', '072', '073', '074', '075', '076', '077', '078', '079'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `+40${prefix}${number}`;
}

// Generate 6-digit verification code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Test scenario 1: Send verification SMS
export function sendVerificationScenario() {
  const phone = generatePhone();
  const code = generateCode();

  const payload = JSON.stringify({
    phone: phone,
    stationSlug: 'test-station',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'SendVerification' },
  };

  const startTime = new Date();
  const response = http.post(`${BASE_URL}/api/verification/send`, payload, params);
  const duration = new Date() - startTime;

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'has success field': (r) => r.json('success') !== undefined,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Record metrics
  smsSuccessRate.add(success);
  apiResponseTime.add(duration);

  if (success && response.json('success')) {
    smsDeliveryTime.add(duration);
  }

  sleep(1); // Wait 1 second between iterations
}

// Test scenario 2: Verify phone with code
export function verifyPhoneScenario() {
  const phone = generatePhone();
  const code = '123456'; // Test code

  const payload = JSON.stringify({
    phone: phone,
    code: code,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'VerifyPhone' },
  };

  const response = http.post(`${BASE_URL}/api/verification/verify`, payload, params);

  check(response, {
    'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
    'has response': (r) => r.body.length > 0,
  });

  sleep(1);
}

// Test scenario 3: Rate limit testing
export function rateLimitScenario() {
  const phone = '+40712345678'; // Same phone to trigger rate limit

  for (let i = 0; i < 6; i++) {
    const payload = JSON.stringify({
      phone: phone,
      stationSlug: 'test-station',
    });

    const response = http.post(`${BASE_URL}/api/verification/send`, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'RateLimit' },
    });

    const isRateLimited = response.status === 429;

    if (i < 5) {
      check(response, {
        'first 5 requests succeed': (r) => r.status === 200,
      });
    } else {
      check(response, {
        '6th request rate limited': (r) => r.status === 429,
      });
    }

    sleep(0.1); // Small delay between requests
  }
}

// Test scenario 4: Error handling
export function errorHandlingScenario() {
  const testCases = [
    { phone: 'invalid', expectedStatus: 400, name: 'Invalid phone format' },
    { phone: '+40', expectedStatus: 400, name: 'Incomplete phone' },
    { phone: '+1234567890', expectedStatus: 400, name: 'Non-Romanian phone' },
    { phone: '', expectedStatus: 400, name: 'Empty phone' },
  ];

  testCases.forEach(testCase => {
    const payload = JSON.stringify({
      phone: testCase.phone,
      stationSlug: 'test-station',
    });

    const response = http.post(`${BASE_URL}/api/verification/send`, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'ErrorHandling', testCase: testCase.name },
    });

    check(response, {
      [`${testCase.name} - correct error status`]: (r) =>
        r.status === testCase.expectedStatus,
    });
  });

  sleep(1);
}

// Test scenario 5: NotifyHub direct test
export function notifyHubDirectScenario() {
  const phone = generatePhone();

  const payload = JSON.stringify({
    to: phone,
    message: 'Load test message from k6',
    templateId: 'load_test',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.NOTIFYHUB_API_KEY}`,
    },
    tags: { name: 'NotifyHubDirect' },
  };

  const response = http.post(`${NOTIFYHUB_URL}/api/send`, payload, params);

  check(response, {
    'NotifyHub status is 200': (r) => r.status === 200,
    'NotifyHub returns messageId': (r) => r.json('messageId') !== undefined,
    'NotifyHub response < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

// Main test execution
export default function () {
  // Randomly choose a scenario (weighted)
  const rand = Math.random();

  if (rand < 0.5) {
    // 50% - Normal verification flow
    sendVerificationScenario();
  } else if (rand < 0.75) {
    // 25% - Verification check
    verifyPhoneScenario();
  } else if (rand < 0.85) {
    // 10% - Error handling
    errorHandlingScenario();
  } else if (rand < 0.95) {
    // 10% - Rate limit testing
    rateLimitScenario();
  } else {
    // 5% - Direct NotifyHub test
    notifyHubDirectScenario();
  }
}

// Summary report at end of test
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options?.indent || '';
  const enableColors = options?.enableColors ?? false;

  let summary = '\n\n';
  summary += `${indent}SMS Load Test Summary\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;

  // HTTP metrics
  const httpReqDuration = data.metrics.http_req_duration;
  summary += `${indent}HTTP Performance:\n`;
  summary += `${indent}  Avg Response: ${httpReqDuration?.values?.avg?.toFixed(2)}ms\n`;
  summary += `${indent}  P95 Response: ${httpReqDuration?.values['p(95)']?.toFixed(2)}ms\n`;
  summary += `${indent}  Max Response: ${httpReqDuration?.values?.max?.toFixed(2)}ms\n\n`;

  // SMS metrics
  const successRate = data.metrics.sms_success_rate;
  summary += `${indent}SMS Success Rate: ${(successRate?.values?.rate * 100).toFixed(2)}%\n\n`;

  // Request stats
  summary += `${indent}Total Requests: ${data.metrics.http_reqs?.values?.count || 0}\n`;
  summary += `${indent}Failed Requests: ${data.metrics.http_req_failed?.values?.rate * 100 || 0}%\n\n`;

  return summary;
}

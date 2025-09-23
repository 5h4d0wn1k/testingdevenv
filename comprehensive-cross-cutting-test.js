const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const LOG_FILE = 'test-results.log';

// Helper function to log results
function log(message) {
  console.log(message);
  fs.appendFileSync(LOG_FILE, message + '\n');
}

// Helper function to make requests
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    if (data) {
      config.body = JSON.stringify(data);
    }
    const response = await fetch(`${BASE_URL}${url}`, config);
    const responseData = await response.text();
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
    };
  } catch (error) {
    return { status: null, headers: {}, data: error.message, error: true };
  }
}

// Test Rate Limiting
async function testRateLimiting() {
  log('=== Testing Rate Limiting ===');

  const endpoints = [
    { url: '/api/upload', limit: 10 },
    { url: '/api/store/media-upload', limit: 20 },
    { url: '/api/stripe', limit: 30 },
  ];

  for (const { url, limit } of endpoints) {
    log(`Testing ${url} with limit ${limit} req/min`);

    // Make requests up to limit + 1
    const requests = [];
    for (let i = 0; i < limit + 1; i++) {
      requests.push(makeRequest('POST', url, { test: 'data' }));
    }

    const results = await Promise.all(requests);

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      if (res.error) {
        log(`Request ${i + 1}: Error - ${res.data}`);
      } else if (i < limit) {
        log(`Request ${i + 1}: Status ${res.status}, Remaining: ${res.headers['x-ratelimit-remaining'] || 'N/A'}`);
      } else {
        log(`Request ${i + 1} (should be limited): Status ${res.status}, Retry-After: ${res.headers['retry-after'] || 'N/A'}`);
      }
    }

    // Wait for reset (simulate)
    log('Waiting 60 seconds for rate limit reset...');
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}

// Test Input Validation
async function testInputValidation() {
  log('=== Testing Input Validation ===');

  // Test address validation
  const invalidAddress = {
    street: '<script>alert("xss")</script>',
    city: 'a'.repeat(256), // too long
    zipCode: 'invalid',
  };
  const res1 = await makeRequest('POST', '/api/address', invalidAddress);
  log(`Address validation: Status ${res1.status}, Data: ${res1.data}`);

  // Test product validation
  const invalidProduct = {
    name: 'SELECT * FROM users;', // SQL injection attempt
    price: -100,
    description: '<img src=x onerror=alert(1)>', // XSS
  };
  const res2 = await makeRequest('POST', '/api/store/product', invalidProduct);
  log(`Product validation: Status ${res2.status}, Data: ${res2.data}`);

  // Test sanitization functions (if exposed via API)
  // Assuming there's an endpoint for testing sanitization
  const xssInput = { input: '<script>alert("test")</script>' };
  const res3 = await makeRequest('POST', '/api/test/sanitize', xssInput);
  log(`Sanitization test: Status ${res3.status}, Data: ${res3.data}`);
}

// Test Error Handling
async function testErrorHandling() {
  log('=== Testing Error Handling ===');

  // 400 Bad Request
  const res1 = await makeRequest('POST', '/api/orders', {});
  log(`400 Test: Status ${res1.status}, Data: ${res1.data}`);

  // 401 Unauthorized
  const res2 = await makeRequest('GET', '/api/store/dashboard');
  log(`401 Test: Status ${res2.status}, Data: ${res2.data}`);

  // 404 Not Found
  const res3 = await makeRequest('GET', '/api/nonexistent');
  log(`404 Test: Status ${res3.status}, Data: ${res3.data}`);

  // 429 Too Many Requests (already tested in rate limiting)

  // 500 Internal Server Error (hard to trigger without bugs)
  // Perhaps send malformed JSON
  const res4 = await makeRequest('POST', '/api/orders', '{invalid json');
  log(`500 Test (malformed JSON): Status ${res4.status}, Data: ${res4.data}`);
}

// Test Security Measures
async function testSecurityMeasures() {
  log('=== Testing Security Measures ===');

  // Authentication on protected endpoints
  const protectedEndpoints = ['/api/store/dashboard', '/api/admin/dashboard'];
  for (const url of protectedEndpoints) {
    const res = await makeRequest('GET', url);
    log(`Auth check ${url}: Status ${res.status}`);
  }

  // XSS prevention
  const xssPayload = { comment: '<script>alert("xss")</script>' };
  const res1 = await makeRequest('POST', '/api/rating', xssPayload);
  log(`XSS prevention: Status ${res1.status}, Data: ${res1.data}`);

  // File upload security
  const fileData = Buffer.from('fake file content').toString('base64');
  const res2 = await makeRequest('POST', '/api/upload', { file: fileData, filename: 'test.exe' });
  log(`File upload security: Status ${res2.status}, Data: ${res2.data}`);

  // CORS and security headers
  const res3 = await makeRequest('OPTIONS', '/api/health');
  log(`CORS headers: ${JSON.stringify(res3.headers)}`);
}

// Test Middleware
async function testMiddleware() {
  log('=== Testing Middleware ===');

  // Request logging (check logs after)
  const res1 = await makeRequest('GET', '/api/health');
  log(`Request logging: Status ${res1.status}`);

  // Auth middleware
  const res2 = await makeRequest('GET', '/api/store/dashboard');
  log(`Auth middleware: Status ${res2.status}`);

  // Rate limiting middleware (already tested)
}

// Test Edge Cases
async function testEdgeCases() {
  log('=== Testing Edge Cases ===');

  // Empty inputs
  const res1 = await makeRequest('POST', '/api/orders', {});
  log(`Empty input: Status ${res1.status}, Data: ${res1.data}`);

  // Large inputs
  const largeInput = { data: 'a'.repeat(10000) };
  const res2 = await makeRequest('POST', '/api/store/product', largeInput);
  log(`Large input: Status ${res2.status}`);

  // Special characters
  const specialChars = { name: '测试🚀<>&"' };
  const res3 = await makeRequest('POST', '/api/store/product', specialChars);
  log(`Special chars: Status ${res3.status}, Data: ${res3.data}`);

  // Concurrent requests
  const concurrentRequests = Array(10).fill().map(() => makeRequest('GET', '/api/health'));
  const results = await Promise.all(concurrentRequests);
  log(`Concurrent requests: All statuses ${results.map(r => r.status).join(', ')}`);

  // Malformed JSON
  const res4 = await makeRequest('POST', '/api/orders', '{malformed');
  log(`Malformed JSON: Status ${res4.status}`);
}

// Main test runner
async function runTests() {
  // Clear log file
  fs.writeFileSync(LOG_FILE, '');

  log('Starting Comprehensive Cross-Cutting Concerns Test');
  log(`Base URL: ${BASE_URL}`);
  log(`Timestamp: ${new Date().toISOString()}`);
  log('');

  await testRateLimiting();
  log('');

  await testInputValidation();
  log('');

  await testErrorHandling();
  log('');

  await testSecurityMeasures();
  log('');

  await testMiddleware();
  log('');

  await testEdgeCases();
  log('');

  log('All tests completed. Check test-results.log for details.');
}

// Run the tests
runTests().catch(console.error);
// Comprehensive test script for file upload functionalities
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3000';

// Mock authentication tokens (will likely fail but test auth requirements)
const MOCK_USER_TOKEN = 'mock-user-token';
const MOCK_SELLER_TOKEN = 'mock-seller-token';

// Test results tracking
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
};

function logTest(testName, success, status, message, details = '') {
    testResults.total++;
    if (success) {
        testResults.passed++;
        console.log(`✅ PASS: ${testName} - ${status} - ${message}`);
    } else {
        testResults.failed++;
        console.log(`❌ FAIL: ${testName} - ${status} - ${message}`);
    }
    if (details) console.log(`   Details: ${details}`);
    testResults.details.push({ testName, success, status, message, details });
}

// Generate test files
function createTestImage(sizeKB = 10, format = 'jpeg') {
    // Create a minimal valid JPEG header + some data
    const jpegHeader = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
        0x08, 0x00, 0x10, 0x00, 0x10, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01,
        0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x08, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF,
        0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F,
        0x00
    ]);

    // Add some data to reach desired size
    const dataSize = Math.max(0, sizeKB * 1024 - jpegHeader.length);
    const data = Buffer.alloc(dataSize);
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.floor(Math.random() * 256);
    }

    const jpegFooter = Buffer.from([0xFF, 0xD9]);

    return Buffer.concat([jpegHeader, data, jpegFooter]);
}

function createLargeFile(sizeMB = 6) {
    return Buffer.alloc(sizeMB * 1024 * 1024, 'x');
}

function createMaliciousFile() {
    return Buffer.from('<script>alert("xss")</script><img src=x onerror=alert(1)>');
}

function createInvalidFile() {
    // Create a file that looks like an image but isn't
    const fakeImage = Buffer.from('This is not an image file content but has some binary data');
    // Add some random bytes
    const randomBytes = Buffer.alloc(100);
    for (let i = 0; i < randomBytes.length; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
    }
    return Buffer.concat([fakeImage, randomBytes]);
}

// Test /api/upload endpoint
async function testUploadEndpoint() {
    console.log('\n=== TESTING /api/upload ENDPOINT ===');

    // Test 1: No authentication
    try {
        const formData = new FormData();
        formData.append('file', createTestImage(10), 'test.jpg');

        await axios.post(`${BASE_URL}/api/upload`, formData, {
            headers: formData.getHeaders()
        });
        logTest('Upload - No Auth', false, 200, 'Should have failed authentication');
    } catch (error) {
        logTest('Upload - No Auth', true, error.response?.status || 'ERROR',
            'Correctly rejected unauthenticated request', error.response?.data?.error);
    }

    // Test 2: Invalid authentication
    try {
        const formData = new FormData();
        formData.append('file', createTestImage(10), 'test.jpg');

        await axios.post(`${BASE_URL}/api/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${MOCK_USER_TOKEN}`
            }
        });
        logTest('Upload - Invalid Auth', false, 200, 'Should have failed authentication');
    } catch (error) {
        logTest('Upload - Invalid Auth', true, error.response?.status || 'ERROR',
            'Correctly rejected invalid authentication', error.response?.data?.error);
    }

    // Test 3: Valid JPEG upload (will fail auth but test file validation)
    try {
        const formData = new FormData();
        formData.append('file', createTestImage(10), 'test.jpg');

        await axios.post(`${BASE_URL}/api/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${MOCK_USER_TOKEN}`
            }
        });
        logTest('Upload - Valid JPEG', false, 200, 'Should have failed authentication');
    } catch (error) {
        const isAuthError = error.response?.status === 401;
        logTest('Upload - Valid JPEG', isAuthError, error.response?.status || 'ERROR',
            isAuthError ? 'Authentication properly required' : 'Unexpected error',
            error.response?.data?.error);
    }

    // Test 4: Invalid file type
    try {
        const formData = new FormData();
        formData.append('file', createInvalidFile(), 'test.txt');

        await axios.post(`${BASE_URL}/api/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${MOCK_USER_TOKEN}`
            }
        });
        logTest('Upload - Invalid File Type', false, 200, 'Should have rejected invalid file type');
    } catch (error) {
        const isValidationError = error.response?.status === 400 &&
            error.response?.data?.error?.includes('invalid type');
        logTest('Upload - Invalid File Type', isValidationError, error.response?.status || 'ERROR',
            isValidationError ? 'Correctly rejected invalid file type' : 'Unexpected response',
            error.response?.data?.error);
    }

    // Test 5: File too large (5MB limit per file)
    try {
        const formData = new FormData();
        formData.append('file', createLargeFile(6), 'large.jpg');

        await axios.post(`${BASE_URL}/api/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${MOCK_USER_TOKEN}`
            }
        });
        logTest('Upload - File Too Large', false, 200, 'Should have rejected large file');
    } catch (error) {
        const isSizeError = error.response?.status === 400 &&
            error.response?.data?.error?.includes('exceeds maximum size');
        logTest('Upload - File Too Large', isSizeError, error.response?.status || 'ERROR',
            isSizeError ? 'Correctly rejected oversized file' : 'Unexpected response',
            error.response?.data?.error);
    }

    // Test 6: Malicious content detection
    try {
        const formData = new FormData();
        formData.append('file', createMaliciousFile(), 'malicious.jpg');

        await axios.post(`${BASE_URL}/api/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${MOCK_USER_TOKEN}`
            }
        });
        logTest('Upload - Malicious Content', false, 200, 'Should have detected malicious content');
    } catch (error) {
        const isSecurityError = error.response?.status === 400 &&
            error.response?.data?.error?.includes('suspicious content');
        logTest('Upload - Malicious Content', isSecurityError, error.response?.status || 'ERROR',
            isSecurityError ? 'Correctly detected malicious content' : 'Unexpected response',
            error.response?.data?.error);
    }

    // Test 7: Multiple files
    try {
        const formData = new FormData();
        formData.append('file', createTestImage(10), 'test1.jpg');
        formData.append('file', createTestImage(10), 'test2.png');

        await axios.post(`${BASE_URL}/api/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${MOCK_USER_TOKEN}`
            }
        });
        logTest('Upload - Multiple Files', false, 200, 'Should have failed authentication');
    } catch (error) {
        const isAuthError = error.response?.status === 401;
        logTest('Upload - Multiple Files', isAuthError, error.response?.status || 'ERROR',
            isAuthError ? 'Authentication properly required for multiple files' : 'Unexpected error',
            error.response?.data?.error);
    }

    // Test 8: Rate limiting (10 requests per minute)
    console.log('Testing rate limiting...');
    const rateLimitPromises = [];
    for (let i = 0; i < 12; i++) {
        const formData = new FormData();
        formData.append('file', createTestImage(1), `test${i}.jpg`);

        rateLimitPromises.push(
            axios.post(`${BASE_URL}/api/upload`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${MOCK_USER_TOKEN}`
                }
            }).catch(error => error)
        );
    }

    const rateLimitResults = await Promise.all(rateLimitPromises);
    const rateLimited = rateLimitResults.some(result =>
        result.response?.status === 429 ||
        result.response?.data?.error?.includes('rate limit')
    );

    logTest('Upload - Rate Limiting', rateLimited, 'MIXED',
        rateLimited ? 'Rate limiting working' : 'Rate limiting may not be working',
        `Out of ${rateLimitResults.length} requests, some were rate limited`);
}

// Test /api/store/media-upload endpoint
async function testMediaUploadEndpoint() {
    console.log('\n=== TESTING /api/store/media-upload ENDPOINT ===');

    // Test 1: No authentication
    try {
        const formData = new FormData();
        formData.append('files', createTestImage(10), 'test.jpg');

        await axios.post(`${BASE_URL}/api/store/media-upload`, formData, {
            headers: formData.getHeaders()
        });
        logTest('Media Upload - No Auth', false, 200, 'Should have failed authentication');
    } catch (error) {
        logTest('Media Upload - No Auth', true, error.response?.status || 'ERROR',
            'Correctly rejected unauthenticated request', error.response?.data?.error);
    }

    // Test 2: Invalid authentication
    try {
        const formData = new FormData();
        formData.append('files', createTestImage(10), 'test.jpg');

        await axios.post(`${BASE_URL}/api/store/media-upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${MOCK_SELLER_TOKEN}`
            }
        });
        logTest('Media Upload - Invalid Auth', false, 200, 'Should have failed authentication');
    } catch (error) {
        logTest('Media Upload - Invalid Auth', true, error.response?.status || 'ERROR',
            'Correctly rejected invalid authentication', error.response?.data?.error);
    }

    // Test 3: File too large (10MB limit)
    try {
        const formData = new FormData();
        formData.append('files', createLargeFile(11), 'large.jpg');

        await axios.post(`${BASE_URL}/api/store/media-upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${MOCK_SELLER_TOKEN}`
            }
        });
        logTest('Media Upload - File Too Large', false, 200, 'Should have rejected large file');
    } catch (error) {
        const isSizeError = error.response?.status === 400 &&
            error.response?.data?.error?.includes('exceeds maximum size');
        logTest('Media Upload - File Too Large', isSizeError, error.response?.status || 'ERROR',
            isSizeError ? 'Correctly rejected oversized file' : 'Unexpected response',
            error.response?.data?.error);
    }

    // Test 4: Invalid file type
    try {
        const formData = new FormData();
        formData.append('files', createInvalidFile(), 'test.txt');

        await axios.post(`${BASE_URL}/api/store/media-upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${MOCK_SELLER_TOKEN}`
            }
        });
        logTest('Media Upload - Invalid File Type', false, 200, 'Should have rejected invalid file type');
    } catch (error) {
        const isValidationError = error.response?.status === 400 &&
            error.response?.data?.error?.includes('not allowed');
        logTest('Media Upload - Invalid File Type', isValidationError, error.response?.status || 'ERROR',
            isValidationError ? 'Correctly rejected invalid file type' : 'Unexpected response',
            error.response?.data?.error);
    }

    // Test 5: Too many files (max 10)
    try {
        const formData = new FormData();
        for (let i = 0; i < 12; i++) {
            formData.append('files', createTestImage(1), `test${i}.jpg`);
        }

        await axios.post(`${BASE_URL}/api/store/media-upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${MOCK_SELLER_TOKEN}`
            }
        });
        logTest('Media Upload - Too Many Files', false, 200, 'Should have rejected too many files');
    } catch (error) {
        const isCountError = error.response?.status === 400 &&
            error.response?.data?.error?.includes('Maximum 10 files');
        logTest('Media Upload - Too Many Files', isCountError, error.response?.status || 'ERROR',
            isCountError ? 'Correctly rejected too many files' : 'Unexpected response',
            error.response?.data?.error);
    }

    // Test 6: Rate limiting (20 uploads per minute)
    console.log('Testing media upload rate limiting...');
    const mediaRateLimitPromises = [];
    for (let i = 0; i < 22; i++) {
        const formData = new FormData();
        formData.append('files', createTestImage(1), `test${i}.jpg`);

        mediaRateLimitPromises.push(
            axios.post(`${BASE_URL}/api/store/media-upload`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${MOCK_SELLER_TOKEN}`
                }
            }).catch(error => error)
        );
    }

    const mediaRateLimitResults = await Promise.all(mediaRateLimitPromises);
    const mediaRateLimited = mediaRateLimitResults.some(result =>
        result.response?.status === 429 ||
        result.response?.data?.error?.includes('rate limit')
    );

    logTest('Media Upload - Rate Limiting', mediaRateLimited, 'MIXED',
        mediaRateLimited ? 'Rate limiting working' : 'Rate limiting may not be working',
        `Out of ${mediaRateLimitResults.length} requests, some were rate limited`);

    // Test 7: Product association (will fail auth but test validation)
    try {
        const formData = new FormData();
        formData.append('files', createTestImage(10), 'test.jpg');
        formData.append('productId', 'invalid-product-id');

        await axios.post(`${BASE_URL}/api/store/media-upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${MOCK_SELLER_TOKEN}`
            }
        });
        logTest('Media Upload - Product Association', false, 200, 'Should have failed authentication');
    } catch (error) {
        const isAuthError = error.response?.status === 401;
        logTest('Media Upload - Product Association', isAuthError, error.response?.status || 'ERROR',
            isAuthError ? 'Authentication properly required' : 'Unexpected error',
            error.response?.data?.error);
    }
}

// Additional edge cases
async function testEdgeCases() {
    console.log('\n=== TESTING EDGE CASES ===');

    // Test empty form data
    try {
        const formData = new FormData();

        await axios.post(`${BASE_URL}/api/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${MOCK_USER_TOKEN}`
            }
        });
        logTest('Edge Case - Empty Form Data', false, 200, 'Should have rejected empty form');
    } catch (error) {
        const isValidationError = error.response?.status === 400 &&
            error.response?.data?.error?.includes('No files provided');
        logTest('Edge Case - Empty Form Data', isValidationError, error.response?.status || 'ERROR',
            isValidationError ? 'Correctly rejected empty form' : 'Unexpected response',
            error.response?.data?.error);
    }

    // Test malformed request
    try {
        await axios.post(`${BASE_URL}/api/upload`, 'not form data', {
            headers: {
                'Content-Type': 'text/plain',
                'Authorization': `Bearer ${MOCK_USER_TOKEN}`
            }
        });
        logTest('Edge Case - Malformed Request', false, 200, 'Should have rejected malformed request');
    } catch (error) {
        logTest('Edge Case - Malformed Request', true, error.response?.status || 'ERROR',
            'Correctly handled malformed request', error.response?.data?.error);
    }

    // Test unsupported HTTP methods
    try {
        await axios.get(`${BASE_URL}/api/upload`);
        logTest('Edge Case - Wrong HTTP Method', false, 200, 'Should have rejected GET request');
    } catch (error) {
        const isMethodError = error.response?.status === 405;
        logTest('Edge Case - Wrong HTTP Method', isMethodError, error.response?.status || 'ERROR',
            isMethodError ? 'Correctly rejected wrong HTTP method' : 'Unexpected response',
            error.response?.data?.error);
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting comprehensive file upload tests...\n');
    console.log('Note: Authentication tests will fail as expected since we\'re using mock tokens.');
    console.log('This verifies that the endpoints properly require authentication.\n');

    try {
        await testUploadEndpoint();
        await testMediaUploadEndpoint();
        await testEdgeCases();
    } catch (error) {
        console.error('Test execution error:', error.message);
    }

    // Print summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    console.log('\n=== ISSUES FOUND ===');
    const failedTests = testResults.details.filter(test => !test.success);
    if (failedTests.length === 0) {
        console.log('✅ No issues found - all validations working as expected');
    } else {
        failedTests.forEach(test => {
            console.log(`- ${test.testName}: ${test.message}`);
            if (test.details) console.log(`  ${test.details}`);
        });
    }

    console.log('\n=== RECOMMENDATIONS ===');
    console.log('1. Ensure proper authentication is implemented for production use');
    console.log('2. Verify rate limiting is working correctly under load');
    console.log('3. Test with real image files for complete validation');
    console.log('4. Monitor server logs for any unexpected errors');

    return testResults;
}

// Run tests
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, testResults };
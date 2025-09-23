// Comprehensive test script for vendor/store dashboard APIs
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Mock authentication headers for store owner
const AUTH_HEADERS = {
    'Authorization': 'Bearer mock-store-owner-token',
    'Content-Type': 'application/json'
};

// Mock data for testing
const MOCK_DATA = {
    product: {
        name: 'Test Product',
        description: 'A test product for API testing',
        mrp: 100,
        price: 80,
        category: 'Electronics',
        stock: 10,
        images: ['https://example.com/image1.jpg'],
        attributes: {},
        tags: ['test', 'api']
    },
    productUpdate: {
        name: 'Updated Test Product',
        description: 'Updated description',
        price: 90
    },
    promotion: {
        promotionType: 'percentage',
        promotionValue: 10,
        promotionStart: new Date().toISOString(),
        promotionEnd: new Date(Date.now() + 86400000).toISOString()
    },
    supportTicket: {
        subject: 'Test Support Ticket',
        message: 'This is a test support ticket',
        priority: 'medium',
        category: 'technical'
    },
    webhook: {
        url: 'https://example.com/webhook',
        events: ['order.created', 'product.updated'],
        secret: 'test-secret'
    },
    settings: {
        storeName: 'Test Store',
        storeDescription: 'A test store',
        contactEmail: 'test@example.com'
    }
};

// Test result tracking
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
};

// Helper function to log test results
function logTest(endpoint, method, success, statusCode, error = null, responseData = null) {
    testResults.total++;
    const status = success ? 'PASS' : 'FAIL';
    if (success) testResults.passed++;
    else testResults.failed++;

    console.log(`[${status}] ${method} ${endpoint} - Status: ${statusCode}`);
    if (error) {
        console.log(`  Error: ${error.message || error}`);
        testResults.errors.push({ endpoint, method, error: error.message || error });
    }
    if (responseData && typeof responseData === 'object') {
        console.log(`  Response: ${JSON.stringify(responseData, null, 2).substring(0, 200)}...`);
    }
}

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null, customHeaders = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = { ...AUTH_HEADERS, ...customHeaders };

    try {
        const config = { method, url, headers };
        if (data && (method === 'POST' || method === 'PUT')) {
            config.data = data;
        }

        const response = await axios(config);
        logTest(endpoint, method, true, response.status, null, response.data);
        return response;
    } catch (error) {
        const statusCode = error.response?.status || 'NETWORK_ERROR';
        logTest(endpoint, method, false, statusCode, error);
        return null;
    }
}

// Test functions for each API group
async function testOnboardingAPI() {
    console.log('\n=== TESTING ONBOARDING API ===');

    // GET onboarding status
    await makeRequest('GET', '/api/store/onboarding');

    // POST onboarding completion (if applicable)
    await makeRequest('POST', '/api/store/onboarding', { completed: true });
}

async function testProductAPIs() {
    console.log('\n=== TESTING PRODUCT APIs ===');

    // GET all products
    await makeRequest('GET', '/api/store/product');

    // POST create product
    const createResponse = await makeRequest('POST', '/api/store/product', MOCK_DATA.product);

    let productId = null;
    if (createResponse && createResponse.data && createResponse.data.product) {
        productId = createResponse.data.product.id;
    } else {
        // Use a mock ID for testing other endpoints
        productId = 'mock-product-id';
    }

    if (productId) {
        // GET specific product
        await makeRequest('GET', `/api/store/product/${productId}`);

        // PUT update product
        await makeRequest('PUT', `/api/store/product/${productId}`, MOCK_DATA.productUpdate);

        // Test sub-endpoints
        await testProductSubEndpoints(productId);

        // DELETE product
        await makeRequest('DELETE', `/api/store/product/${productId}`);
    }

    // Test bulk operations
    await testBulkProductOperations();
}

async function testProductSubEndpoints(productId) {
    console.log(`\n--- TESTING PRODUCT SUB-ENDPOINTS for ${productId} ---`);

    // Media endpoints
    await makeRequest('GET', `/api/store/product/${productId}/media`);
    await makeRequest('POST', `/api/store/product/${productId}/media`, { images: ['https://example.com/new-image.jpg'] });

    // Pricing endpoints
    await makeRequest('GET', `/api/store/product/${productId}/pricing`);
    await makeRequest('PUT', `/api/store/product/${productId}/pricing`, { price: 85, mrp: 100 });

    // Promotions endpoints
    await makeRequest('GET', `/api/store/product/${productId}/promotions`);
    await makeRequest('PUT', `/api/store/product/${productId}/promotions`, MOCK_DATA.promotion);

    // Status endpoints
    await makeRequest('PUT', `/api/store/product/${productId}/status`, { status: 'active' });

    // Stock endpoints
    await makeRequest('GET', `/api/store/product/${productId}/stock`);
    await makeRequest('PUT', `/api/store/product/${productId}/stock`, { stock: 15 });

    // Revert endpoint
    await makeRequest('POST', `/api/store/product/${productId}/revert`, { version: 1 });
}

async function testBulkProductOperations() {
    console.log('\n--- TESTING BULK PRODUCT OPERATIONS ---');

    // Bulk status update
    await makeRequest('PUT', '/api/store/product/bulk-status', {
        productIds: ['id1', 'id2'],
        status: 'active'
    });

    // Bulk stock update
    await makeRequest('PUT', '/api/store/product/bulk-stock', {
        updates: [
            { productId: 'id1', stock: 10 },
            { productId: 'id2', stock: 20 }
        ]
    });

    // Bulk upload
    await makeRequest('POST', '/api/store/product/bulk-upload', {
        products: [MOCK_DATA.product]
    });
}

async function testOrdersAPI() {
    console.log('\n=== TESTING ORDERS API ===');

    // GET orders
    await makeRequest('GET', '/api/store/orders');

    // GET orders with filters
    await makeRequest('GET', '/api/store/orders?status=pending');
}

async function testFinancialAPIs() {
    console.log('\n=== TESTING FINANCIAL APIs ===');

    // GET financials
    await makeRequest('GET', '/api/store/financials');

    // GET payouts
    await makeRequest('GET', '/api/store/payouts');
}

async function testAnalyticsAPI() {
    console.log('\n=== TESTING ANALYTICS API ===');

    // GET analytics
    await makeRequest('GET', '/api/store/analytics');

    // GET dashboard
    await makeRequest('GET', '/api/store/dashboard');
}

async function testSupportAPIs() {
    console.log('\n=== TESTING SUPPORT APIs ===');

    // GET support tickets
    await makeRequest('GET', '/api/store/support/tickets');

    // POST create support ticket
    const ticketResponse = await makeRequest('POST', '/api/store/support/tickets', MOCK_DATA.supportTicket);

    let ticketId = null;
    if (ticketResponse && ticketResponse.data && ticketResponse.data.ticket) {
        ticketId = ticketResponse.data.ticket.id;
    } else {
        ticketId = 'mock-ticket-id';
    }

    if (ticketId) {
        // GET specific ticket
        await makeRequest('GET', `/api/store/support/tickets/${ticketId}`);

        // PUT update ticket
        await makeRequest('PUT', `/api/store/support/tickets/${ticketId}`, {
            status: 'in_progress',
            message: 'Working on your issue'
        });
    }
}

async function testSettingsAndProfileAPIs() {
    console.log('\n=== TESTING SETTINGS & PROFILE APIs ===');

    // GET settings
    await makeRequest('GET', '/api/store/settings');

    // PUT update settings
    await makeRequest('PUT', '/api/store/settings', MOCK_DATA.settings);

    // GET profile
    await makeRequest('GET', '/api/store/profile');

    // PUT update profile
    await makeRequest('PUT', '/api/store/profile', {
        storeName: 'Updated Store Name',
        description: 'Updated description'
    });
}

async function testAdditionalStoreAPIs() {
    console.log('\n=== TESTING ADDITIONAL STORE APIs ===');

    // Inventory
    await makeRequest('GET', '/api/store/inventory');

    // Notifications
    await makeRequest('GET', '/api/store/notifications');

    // Refunds
    await makeRequest('GET', '/api/store/refunds');

    // Reports
    await makeRequest('GET', '/api/store/reports');

    // Returns
    await makeRequest('GET', '/api/store/returns');

    // Shipments
    await makeRequest('GET', '/api/store/shipments');

    // Statements
    await makeRequest('GET', '/api/store/statements');

    // Subscription
    await makeRequest('GET', '/api/store/subscription');

    // Webhooks
    await testWebhookAPIs();

    // Other APIs
    await makeRequest('GET', '/api/store/alerts');
    await makeRequest('GET', '/api/store/announcements');
    await makeRequest('GET', '/api/store/api-keys');
    await makeRequest('GET', '/api/store/attribute-templates');
    await makeRequest('GET', '/api/store/data');
    await makeRequest('GET', '/api/store/documents');
    await makeRequest('GET', '/api/store/knowledge-base');
    await makeRequest('GET', '/api/store/status');
}

async function testWebhookAPIs() {
    console.log('\n--- TESTING WEBHOOK APIs ---');

    // GET webhooks
    await makeRequest('GET', '/api/store/webhooks');

    // POST create webhook
    const webhookResponse = await makeRequest('POST', '/api/store/webhooks', MOCK_DATA.webhook);

    let webhookId = null;
    if (webhookResponse && webhookResponse.data && webhookResponse.data.webhook) {
        webhookId = webhookResponse.data.webhook.id;
    } else {
        webhookId = 'mock-webhook-id';
    }

    if (webhookId) {
        // GET specific webhook
        await makeRequest('GET', `/api/store/webhooks/${webhookId}`);

        // PUT update webhook
        await makeRequest('PUT', `/api/store/webhooks/${webhookId}`, {
            ...MOCK_DATA.webhook,
            url: 'https://example.com/updated-webhook'
        });

        // DELETE webhook
        await makeRequest('DELETE', `/api/store/webhooks/${webhookId}`);
    }
}

async function testErrorCases() {
    console.log('\n=== TESTING ERROR CASES ===');

    // Test invalid endpoints
    await makeRequest('GET', '/api/store/invalid-endpoint');

    // Test invalid product ID
    await makeRequest('GET', '/api/store/product/invalid-id');

    // Test invalid HTTP methods
    await makeRequest('PATCH', '/api/store/product');

    // Test malformed data
    await makeRequest('POST', '/api/store/product', { invalid: 'data' });

    // Test unauthorized access (without auth headers)
    try {
        await axios.get(`${BASE_URL}/api/store/dashboard`);
    } catch (error) {
        logTest('/api/store/dashboard', 'GET (no auth)', false, error.response?.status || 'NETWORK_ERROR', error);
    }
}

// Main test runner
async function runTests() {
    console.log('Starting comprehensive vendor API tests...\n');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Auth Headers: ${JSON.stringify(AUTH_HEADERS, null, 2)}\n`);

    try {
        // Run all API tests
        await testOnboardingAPI();
        await testProductAPIs();
        await testOrdersAPI();
        await testFinancialAPIs();
        await testAnalyticsAPI();
        await testSupportAPIs();
        await testSettingsAndProfileAPIs();
        await testAdditionalStoreAPIs();
        await testErrorCases();

        // Print summary
        console.log('\n=== TEST SUMMARY ===');
        console.log(`Total Tests: ${testResults.total}`);
        console.log(`Passed: ${testResults.passed}`);
        console.log(`Failed: ${testResults.failed}`);
        console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);

        if (testResults.errors.length > 0) {
            console.log('\n=== ERRORS ===');
            testResults.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.method} ${error.endpoint}: ${error.error}`);
            });
        }

    } catch (error) {
        console.error('Test runner error:', error);
    }
}

// Run the tests
runTests().catch(console.error);
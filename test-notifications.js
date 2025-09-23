// Comprehensive test script for notifications system

// Mock email sending to avoid actual emails
const originalSendEmail = require('./lib/email.js').sendEmail;
require('./lib/email.js').sendEmail = async () => {
    console.log('MOCK: Email would be sent');
    return true;
};

// Mock Prisma for platform settings
const originalPrisma = require('./lib/prisma.js').default;
const mockPrisma = {
    platformSettings: {
        findFirst: async () => ({
            emailNotificationsEnabled: true,
            newUserNotifications: true,
            orderNotifications: true,
            commissionNotifications: true,
            payoutNotifications: true,
            systemNotifications: true,
            siteName: 'TestSite'
        })
    },
    store: {
        findUnique: async ({ where }) => {
            if (where.id === 'valid-store-id') {
                return {
                    id: 'valid-store-id',
                    email: 'test@example.com',
                    name: 'Test Store'
                };
            }
            return null;
        }
    },
    notification: {
        create: async ({ data }) => ({
            id: 'mock-notification-id',
            ...data,
            createdAt: new Date()
        })
    }
};
require('./lib/prisma.js').default = mockPrisma;

const { sendNotification } = require('./lib/notifications.js');

const BASE_URL = 'http://localhost:3001';

class TestRunner {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }

    log(message) {
        console.log(`[${new Date().toISOString()}] ${message}`);
    }

    assert(condition, message, details = '') {
        if (condition) {
            this.passed++;
            this.log(`✅ PASS: ${message}`);
        } else {
            this.failed++;
            this.log(`❌ FAIL: ${message}`);
            if (details) this.log(`   Details: ${details}`);
        }
        this.results.push({ message, passed: condition, details });
    }

    async testAPIEndpoint() {
        this.log('\n=== TESTING API ENDPOINT /api/store/notifications ===');

        // Test 1: Valid EMAIL notification
        try {
            const response = await fetch(`${BASE_URL}/api/store/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: 'valid-store-id',
                    title: 'Test Email Notification',
                    message: 'This is a test email notification',
                    type: 'EMAIL'
                })
            });
            const data = await response.json();
            this.assert(response.status === 201, 'Valid EMAIL notification creation', `Status: ${response.status}, Response: ${JSON.stringify(data)}`);
        } catch (error) {
            this.assert(false, 'Valid EMAIL notification creation', `Error: ${error.message}`);
        }

        // Test 2: Valid DASHBOARD notification
        try {
            const response = await fetch(`${BASE_URL}/api/store/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: 'valid-store-id',
                    title: 'Test Dashboard Notification',
                    message: 'This is a test dashboard notification',
                    type: 'DASHBOARD'
                })
            });
            const data = await response.json();
            this.assert(response.status === 201, 'Valid DASHBOARD notification creation', `Status: ${response.status}, Response: ${JSON.stringify(data)}`);
        } catch (error) {
            this.assert(false, 'Valid DASHBOARD notification creation', `Error: ${error.message}`);
        }

        // Test 3: Missing storeId
        try {
            const response = await fetch(`${BASE_URL}/api/store/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: 'Test Notification',
                    message: 'Missing storeId',
                    type: 'EMAIL'
                })
            });
            const data = await response.json();
            this.assert(response.status === 400, 'Missing storeId validation', `Status: ${response.status}, Error: ${data.error}`);
        } catch (error) {
            this.assert(false, 'Missing storeId validation', `Error: ${error.message}`);
        }

        // Test 4: Missing title
        try {
            const response = await fetch(`${BASE_URL}/api/store/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: 'valid-store-id',
                    message: 'Missing title',
                    type: 'EMAIL'
                })
            });
            const data = await response.json();
            this.assert(response.status === 400, 'Missing title validation', `Status: ${response.status}, Error: ${data.error}`);
        } catch (error) {
            this.assert(false, 'Missing title validation', `Error: ${error.message}`);
        }

        // Test 5: Missing message
        try {
            const response = await fetch(`${BASE_URL}/api/store/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: 'valid-store-id',
                    title: 'Test Notification',
                    type: 'EMAIL'
                })
            });
            const data = await response.json();
            this.assert(response.status === 400, 'Missing message validation', `Status: ${response.status}, Error: ${data.error}`);
        } catch (error) {
            this.assert(false, 'Missing message validation', `Error: ${error.message}`);
        }

        // Test 6: Missing type
        try {
            const response = await fetch(`${BASE_URL}/api/store/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: 'valid-store-id',
                    title: 'Test Notification',
                    message: 'Missing type'
                })
            });
            const data = await response.json();
            this.assert(response.status === 400, 'Missing type validation', `Status: ${response.status}, Error: ${data.error}`);
        } catch (error) {
            this.assert(false, 'Missing type validation', `Error: ${error.message}`);
        }

        // Test 7: Invalid type
        try {
            const response = await fetch(`${BASE_URL}/api/store/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: 'valid-store-id',
                    title: 'Test Notification',
                    message: 'Invalid type',
                    type: 'INVALID'
                })
            });
            const data = await response.json();
            this.assert(response.status === 400, 'Invalid type validation', `Status: ${response.status}, Error: ${data.error}`);
        } catch (error) {
            this.assert(false, 'Invalid type validation', `Error: ${error.message}`);
        }

        // Test 8: Non-existent store
        try {
            const response = await fetch(`${BASE_URL}/api/store/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: 'non-existent-store',
                    title: 'Test Notification',
                    message: 'Non-existent store',
                    type: 'EMAIL'
                })
            });
            const data = await response.json();
            this.assert(response.status === 404, 'Non-existent store validation', `Status: ${response.status}, Error: ${data.error}`);
        } catch (error) {
            this.assert(false, 'Non-existent store validation', `Error: ${error.message}`);
        }
    }

    async testNotificationLibrary() {
        this.log('\n=== TESTING NOTIFICATION LIBRARY FUNCTIONS ===');

        // Test 1: sendNotification with newUser type
        try {
            const result = await sendNotification('newUser', { email: 'test@example.com', name: 'Test User' });
            this.assert(result === true, 'sendNotification newUser type', 'Should return true for enabled notification');
        } catch (error) {
            this.assert(false, 'sendNotification newUser type', `Error: ${error.message}`);
        }

        // Test 2: sendNotification with order type
        try {
            const result = await sendNotification('order', { email: 'test@example.com', orderId: '123', total: 100, currency: 'USD' });
            this.assert(result === true, 'sendNotification order type', 'Should return true for enabled notification');
        } catch (error) {
            this.assert(false, 'sendNotification order type', `Error: ${error.message}`);
        }

        // Test 3: sendNotification with commission type
        try {
            const result = await sendNotification('commission', { email: 'test@example.com', amount: 50, currency: 'USD', storeName: 'Test Store' });
            this.assert(result === true, 'sendNotification commission type', 'Should return true for enabled notification');
        } catch (error) {
            this.assert(false, 'sendNotification commission type', `Error: ${error.message}`);
        }

        // Test 4: sendNotification with payout type
        try {
            const result = await sendNotification('payout', { email: 'test@example.com', amount: 200, currency: 'USD', status: 'paid' });
            this.assert(result === true, 'sendNotification payout type', 'Should return true for enabled notification');
        } catch (error) {
            this.assert(false, 'sendNotification payout type', `Error: ${error.message}`);
        }

        // Test 5: sendNotification with system type
        try {
            const result = await sendNotification('system', { email: 'test@example.com', subject: 'System Alert', message: 'Test system message' });
            this.assert(result === true, 'sendNotification system type', 'Should return true for enabled notification');
        } catch (error) {
            this.assert(false, 'sendNotification system type', `Error: ${error.message}`);
        }

        // Test 6: sendNotification with vendor type
        try {
            const result = await sendNotification('vendor', { email: 'test@example.com', type: 'approved', storeName: 'Test Store' });
            this.assert(result === true, 'sendNotification vendor type', 'Should return true for enabled notification');
        } catch (error) {
            this.assert(false, 'sendNotification vendor type', `Error: ${error.message}`);
        }

        // Test 7: sendNotification with support type
        try {
            const result = await sendNotification('support', { email: 'test@example.com', ticketId: '456', subject: 'Support Reply', message: 'Test reply', replyFrom: 'Admin' });
            this.assert(result === true, 'sendNotification support type', 'Should return true for enabled notification');
        } catch (error) {
            this.assert(false, 'sendNotification support type', `Error: ${error.message}`);
        }

        // Test 8: sendNotification with disabled email notifications
        try {
            mockPrisma.platformSettings.findFirst = async () => ({
                emailNotificationsEnabled: false,
                newUserNotifications: true,
                siteName: 'TestSite'
            });
            const result = await sendNotification('newUser', { email: 'test@example.com', name: 'Test User' });
            this.assert(result === false, 'sendNotification with disabled email notifications', 'Should return false when email notifications are disabled');
        } catch (error) {
            this.assert(false, 'sendNotification with disabled email notifications', `Error: ${error.message}`);
        }

        // Test 9: sendNotification with disabled specific notification type
        try {
            mockPrisma.platformSettings.findFirst = async () => ({
                emailNotificationsEnabled: true,
                newUserNotifications: false,
                siteName: 'TestSite'
            });
            const result = await sendNotification('newUser', { email: 'test@example.com', name: 'Test User' });
            this.assert(result === false, 'sendNotification with disabled specific type', 'Should return false when specific notification type is disabled');
        } catch (error) {
            this.assert(false, 'sendNotification with disabled specific type', `Error: ${error.message}`);
        }

        // Test 10: sendNotification with invalid type
        try {
            const result = await sendNotification('invalidType', {});
            this.assert(result === false, 'sendNotification with invalid type', 'Should return false for invalid notification type');
        } catch (error) {
            this.assert(false, 'sendNotification with invalid type', `Error: ${error.message}`);
        }

        // Reset mock settings
        mockPrisma.platformSettings.findFirst = async () => ({
            emailNotificationsEnabled: true,
            newUserNotifications: true,
            orderNotifications: true,
            commissionNotifications: true,
            payoutNotifications: true,
            systemNotifications: true,
            siteName: 'TestSite'
        });
    }

    async testPlatformSettingsIntegration() {
        this.log('\n=== TESTING PLATFORM SETTINGS INTEGRATION ===');

        // Test 1: Email notifications disabled globally
        try {
            mockPrisma.platformSettings.findFirst = async () => ({
                emailNotificationsEnabled: false
            });
            const result = await sendNotification('newUser', { email: 'test@example.com', name: 'Test User' });
            this.assert(result === false, 'Global email notifications disabled', 'Should return false when emailNotificationsEnabled is false');
        } catch (error) {
            this.assert(false, 'Global email notifications disabled', `Error: ${error.message}`);
        }

        // Test 2: Individual notification type disabled
        try {
            mockPrisma.platformSettings.findFirst = async () => ({
                emailNotificationsEnabled: true,
                orderNotifications: false
            });
            const result = await sendNotification('order', { email: 'test@example.com', orderId: '123', total: 100 });
            this.assert(result === false, 'Individual notification type disabled', 'Should return false when specific notification type is disabled');
        } catch (error) {
            this.assert(false, 'Individual notification type disabled', `Error: ${error.message}`);
        }

        // Test 3: Fallback when settings not found
        try {
            mockPrisma.platformSettings.findFirst = async () => null;
            const result = await sendNotification('newUser', { email: 'test@example.com', name: 'Test User' });
            this.assert(result === false, 'Fallback when platform settings not found', 'Should return false when no platform settings exist');
        } catch (error) {
            this.assert(false, 'Fallback when platform settings not found', `Error: ${error.message}`);
        }

        // Reset mock settings
        mockPrisma.platformSettings.findFirst = async () => ({
            emailNotificationsEnabled: true,
            newUserNotifications: true,
            orderNotifications: true,
            commissionNotifications: true,
            payoutNotifications: true,
            systemNotifications: true,
            siteName: 'TestSite'
        });
    }

    async runAllTests() {
        this.log('Starting comprehensive notifications system tests...\n');

        await this.testAPIEndpoint();
        await this.testNotificationLibrary();
        await this.testPlatformSettingsIntegration();

        this.log('\n=== TEST SUMMARY ===');
        this.log(`Total Tests: ${this.passed + this.failed}`);
        this.log(`Passed: ${this.passed}`);
        this.log(`Failed: ${this.failed}`);
        this.log(`Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(2)}%`);

        if (this.failed > 0) {
            this.log('\nFailed Tests:');
            this.results.filter(r => !r.passed).forEach(r => {
                this.log(`- ${r.message}`);
                if (r.details) this.log(`  ${r.details}`);
            });
        }

        // Restore original functions
        require('./lib/email.js').sendEmail = originalSendEmail;
        require('./lib/prisma.js').default = originalPrisma;
    }
}

// Run tests
const runner = new TestRunner();
runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});
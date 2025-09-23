// Test script for platform commission settings
const axios = require('axios');

async function testPlatformCommissionUpdate() {
    try {
        console.log('=== TESTING PLATFORM COMMISSION UPDATE ===\n');

        // First, get current settings
        console.log('Fetching current settings...');
        const getResponse = await axios.get('http://localhost:3001/api/admin/settings');
        console.log('Current settings:', JSON.stringify(getResponse.data.settings, null, 2));

        // Try to update category commission rates
        console.log('\nTrying to update category commission rates...');
        const updatePayload = {
            categoryCommissionRates: {
                'Electronics': 15.0,
                'Clothing': 12.0
            }
        };
        console.log('Update payload:', JSON.stringify(updatePayload, null, 2));

        try {
            const patchResponse = await axios.patch('http://localhost:3001/api/admin/settings', updatePayload);
            console.log('Update successful:', JSON.stringify(patchResponse.data.settings, null, 2));
        } catch (error) {
            console.error('Update failed:', error.response?.data || error.message);
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testPlatformCommissionUpdate();
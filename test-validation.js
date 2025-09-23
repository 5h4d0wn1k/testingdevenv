// Test script for platform settings validation
const { platformSettingsSchema } = require('./lib/validations');

function testValidation() {
    console.log('=== TESTING PLATFORM SETTINGS VALIDATION ===\n');

    // Test valid data with new fields
    const validData = {
        globalCommissionRate: 15.5,
        categoryCommissionRates: {
            'Electronics': 12.0,
            'Clothing': 10.0,
            'Books': 8.0
        }
    };

    console.log('Testing valid data:', JSON.stringify(validData, null, 2));
    const validation = platformSettingsSchema.safeParse(validData);
    if (validation.success) {
        console.log('✓ Validation passed');
    } else {
        console.log('✗ Validation failed:', validation.error.errors);
    }

    // Test invalid globalCommissionRate (out of range)
    const invalidData1 = {
        globalCommissionRate: 150 // > 100
    };
    console.log('\nTesting invalid globalCommissionRate (150):');
    const validation1 = platformSettingsSchema.safeParse(invalidData1);
    if (!validation1.success) {
        console.log('✓ Correctly rejected invalid globalCommissionRate');
    } else {
        console.log('✗ Should have rejected invalid globalCommissionRate');
    }

    // Test invalid categoryCommissionRates (value out of range)
    const invalidData2 = {
        categoryCommissionRates: {
            'Electronics': 120 // > 100
        }
    };
    console.log('\nTesting invalid categoryCommissionRates (120):');
    const validation2 = platformSettingsSchema.safeParse(invalidData2);
    if (!validation2.success) {
        console.log('✓ Correctly rejected invalid categoryCommissionRates');
    } else {
        console.log('✗ Should have rejected invalid categoryCommissionRates');
    }

    // Test valid partial update
    const partialData = {
        globalCommissionRate: 20.0
    };
    console.log('\nTesting partial update:', JSON.stringify(partialData, null, 2));
    const validation3 = platformSettingsSchema.safeParse(partialData);
    if (validation3.success) {
        console.log('✓ Partial update validation passed');
    } else {
        console.log('✗ Partial update validation failed:', validation3.error.errors);
    }

    console.log('\n=== VALIDATION TEST COMPLETE ===');
}

testValidation();
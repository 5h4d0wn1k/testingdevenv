// Test script for error handling in commission system
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testErrorHandling() {
    try {
        console.log('=== ERROR HANDLING TEST ===\n');

        // Test 1: Order without commission rate
        console.log('1. Testing order creation without commission rate');
        const uniqueId = Date.now().toString();
        const testUser2 = await prisma.user.upsert({
            where: { id: 'test-user-2' },
            update: {},
            create: {
                id: 'test-user-2',
                name: 'Test User 2',
                email: `test2-${uniqueId}@example.com`,
                image: 'https://example.com/image.jpg'
            }
        });

        const storeWithoutRate = await prisma.store.upsert({
            where: { username: 'norate' },
            update: {},
            create: {
                userId: testUser2.id,
                name: 'Store Without Rate',
                username: 'norate',
                email: `norate-${uniqueId}@example.com`,
                address: '123 No Rate St',
                contact: '123-456-7890',
                logo: 'https://example.com/logo.jpg',
                description: 'Store without commission rate',
                status: 'approved',
                isActive: true
            }
        });

        const productNoRate = await prisma.product.create({
            data: {
                name: 'Product No Rate',
                description: 'Product from store without rate',
                mrp: 50.0,
                price: 40.0,
                images: ['https://example.com/product.jpg'],
                category: 'Test',
                storeId: storeWithoutRate.id
            }
        });

        // This should fail in the API because no commission rate exists
        console.log('This would fail in the API: no commission rate for store');

        // Test 2: Invalid commission rate values
        console.log('\n2. Testing invalid commission rate values');
        const testStore = await prisma.store.findFirst();

        // Rate too high
        try {
            await prisma.commissionRate.create({
                data: {
                    storeId: testStore.id,
                    rate: 150.0, // Over 100%
                    adminUserId: 'test-admin'
                }
            });
        } catch (error) {
            console.log('Rate > 100% rejected');
        }

        // Negative rate
        try {
            await prisma.commissionRate.create({
                data: {
                    storeId: testStore.id,
                    rate: -5.0,
                    adminUserId: 'test-admin'
                }
            });
        } catch (error) {
            console.log('Negative rate rejected');
        }

        // Test 3: Duplicate commission rates
        console.log('\n3. Testing duplicate commission rates');
        try {
            await prisma.commissionRate.create({
                data: {
                    storeId: testStore.id,
                    rate: 15.0,
                    adminUserId: 'test-admin'
                }
            });
            console.log('First rate created');

            // Try to create another for same store
            await prisma.commissionRate.create({
                data: {
                    storeId: testStore.id,
                    rate: 20.0,
                    adminUserId: 'test-admin'
                }
            });
            console.log('Duplicate rate created (this should not happen in API)');
        } catch (error) {
            console.log(`Duplicate rate rejected: ${error.code}`);
        }

        // Test 4: Payout approval of non-existent payout
        console.log('\n4. Testing payout approval of non-existent payout');
        try {
            await prisma.payout.update({
                where: { id: 'non-existent-id' },
                data: { status: 'PAID' }
            });
        } catch (error) {
            console.log(`Non-existent payout approval failed: ${error.code}`);
        }

        // Test 5: Payout approval of already paid payout
        console.log('\n5. Testing payout approval of already paid payout');
        const paidPayout = await prisma.payout.findFirst({
            where: { status: 'PAID' }
        });
        if (paidPayout) {
            try {
                await prisma.payout.update({
                    where: { id: paidPayout.id },
                    data: { status: 'PAID' }
                });
            } catch (error) {
                console.log('Re-approval of paid payout would be rejected in API');
            }
        }

        console.log('\n=== ERROR HANDLING TEST COMPLETE ===');

    } catch (error) {
        console.error('Error handling test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testErrorHandling();
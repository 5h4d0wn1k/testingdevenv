// Test script for admin commission functionality
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAdminFunctionality() {
    try {
        console.log('=== ADMIN COMMISSION FUNCTIONALITY TEST ===\n');

        // Test 1: Get commission rates
        console.log('1. Testing GET /api/admin/commissions');
        const commissionRates = await prisma.commissionRate.findMany({
            include: { store: true }
        });
        console.log(`Found ${commissionRates.length} commission rates`);
        commissionRates.forEach(rate => {
            console.log(`- Store: ${rate.store.name}, Rate: ${rate.rate}%`);
        });

        // Test 2: Check admin dashboard data
        console.log('\n2. Testing admin dashboard data');
        const orders = await prisma.order.count();
        const stores = await prisma.store.count();
        const allOrders = await prisma.order.findMany({
            select: { createdAt: true, total: true }
        });
        let totalRevenue = 0;
        allOrders.forEach(order => {
            totalRevenue += order.total;
        });
        const products = await prisma.product.count();

        console.log(`Orders: ${orders}`);
        console.log(`Stores: ${stores}`);
        console.log(`Products: ${products}`);
        console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);

        // Test 3: Check payouts
        console.log('\n3. Testing payouts functionality');
        const payouts = await prisma.payout.findMany({
            include: { store: true }
        });
        console.log(`Found ${payouts.length} payouts`);

        // Test 4: Create a payout (simulate commission payout)
        console.log('\n4. Creating a test payout');
        const testStore = await prisma.store.findFirst();
        if (testStore) {
            // Calculate total commissions for this store
            const storeOrders = await prisma.order.findMany({
                where: { storeId: testStore.id },
                select: { totalCommission: true }
            });
            const totalCommissions = storeOrders.reduce((sum, order) => sum + order.totalCommission, 0);

            console.log(`Store ${testStore.name} has total commissions: $${totalCommissions}`);

            if (totalCommissions > 0) {
                const payout = await prisma.payout.create({
                    data: {
                        storeId: testStore.id,
                        amount: totalCommissions
                    }
                });
                console.log(`Created payout: $${payout.amount} for store ${testStore.name}`);

                // Test approving payout
                console.log('\n5. Testing payout approval');
                const approvedPayout = await prisma.payout.update({
                    where: { id: payout.id },
                    data: {
                        status: 'PAID',
                        payoutDate: new Date()
                    }
                });
                console.log(`Approved payout: ${approvedPayout.status} on ${approvedPayout.payoutDate}`);
            }
        }

        // Test 5: Check error handling - try to create commission rate without store
        console.log('\n6. Testing error handling - invalid commission rate');
        try {
            await prisma.commissionRate.create({
                data: {
                    storeId: 'non-existent-store',
                    rate: 10.0,
                    adminUserId: 'test-admin'
                }
            });
        } catch (error) {
            console.log(`Expected error caught: ${error.code} - ${error.message}`);
        }

        console.log('\n=== ADMIN TEST COMPLETE ===');

    } catch (error) {
        console.error('Admin test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testAdminFunctionality();
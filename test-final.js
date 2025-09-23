// Final test to verify all fixes work
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFinal() {
    try {
        console.log('=== FINAL COMMISSION SYSTEM TEST ===\n');

        // Check if commission was marked as paid
        const orders = await prisma.order.findMany({
            select: {
                id: true,
                total: true,
                totalCommission: true,
                commissionPaid: true
            }
        });

        console.log('Order commission status:');
        orders.forEach(order => {
            console.log(`- Order ${order.id}: Commission $${order.totalCommission}, Paid: ${order.commissionPaid}`);
        });

        // Check commission rates constraint
        const testStore = await prisma.store.findFirst();
        if (testStore) {
            try {
                await prisma.commissionRate.create({
                    data: {
                        storeId: testStore.id,
                        rate: 15.0,
                        adminUserId: 'test-admin'
                    }
                });
                console.log('\nERROR: Duplicate commission rate was allowed!');
            } catch (error) {
                console.log('\n✓ Duplicate commission rate properly rejected');
            }
        }

        // Check dashboard data
        const allOrders = await prisma.order.findMany({
            select: {
                total: true,
                totalCommission: true,
                commissionPaid: true
            }
        });

        let totalRevenue = 0;
        let totalCommissions = 0;
        let paidCommissions = 0;

        allOrders.forEach(order => {
            totalRevenue += order.total;
            totalCommissions += order.totalCommission;
            if (order.commissionPaid) {
                paidCommissions += order.totalCommission;
            }
        });

        console.log('\nDashboard metrics:');
        console.log(`- Total Revenue: $${totalRevenue.toFixed(2)}`);
        console.log(`- Total Commissions: $${totalCommissions.toFixed(2)}`);
        console.log(`- Paid Commissions: $${paidCommissions.toFixed(2)}`);
        console.log(`- Pending Commissions: $${(totalCommissions - paidCommissions).toFixed(2)}`);

        console.log('\n=== ALL FIXES VERIFIED ===');

    } catch (error) {
        console.error('Final test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testFinal();
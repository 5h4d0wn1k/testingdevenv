// Debug payout issue
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPayout() {
    try {
        const payouts = await prisma.payout.findMany({
            include: { store: true }
        });
        console.log('Payouts:', payouts);

        const orders = await prisma.order.findMany({
            include: { store: true }
        });
        console.log('Orders:', orders.map(o => ({
            id: o.id,
            storeId: o.storeId,
            commissionPaid: o.commissionPaid,
            totalCommission: o.totalCommission
        })));

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

debugPayout();
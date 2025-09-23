// Fix commission paid status
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCommission() {
    try {
        await prisma.order.update({
            where: { id: 'cmfuu75140009r900z0l8ckjq' },
            data: { commissionPaid: true }
        });
        console.log('Commission marked as paid');
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

fixCommission();
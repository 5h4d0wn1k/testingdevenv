const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            take: 5,
            select: {
                id: true,
                name: true,
                email: true
            }
        });

        console.log('Existing users:');
        users.forEach(user => {
            console.log(`- ${user.id}: ${user.name} (${user.email})`);
        });

        const stores = await prisma.store.findMany({
            take: 5,
            select: {
                id: true,
                username: true,
                name: true,
                userId: true
            }
        });

        console.log('\nExisting stores:');
        stores.forEach(store => {
            console.log(`- ${store.username}: ${store.name} (user: ${store.userId})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
// Test script for commission system
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCommissionSystem() {
    try {
        console.log('=== COMMISSION SYSTEM TEST ===\n');

        // Check existing stores
        const stores = await prisma.store.findMany({
            include: { CommissionRate: true }
        });
        console.log('Existing stores:', stores.length);
        stores.forEach(store => {
            const rate = store.CommissionRate.length > 0 ? store.CommissionRate[0].rate : 'Not set';
            console.log(`- ${store.name} (${store.username}): Commission rate: ${rate}`);
        });

        // Check existing commission rates
        const commissionRates = await prisma.commissionRate.findMany({
            include: { store: true }
        });
        console.log('\nCommission rates:', commissionRates.length);

        // Check existing orders
        const orders = await prisma.order.findMany({
            include: { orderItems: true }
        });
        console.log('\nExisting orders:', orders.length);
        orders.forEach(order => {
            console.log(`- Order ${order.id}: Total: $${order.total}, Commission: $${order.totalCommission}, Paid: ${order.commissionPaid}`);
        });

        // Create test data if needed
        if (stores.length === 0) {
            console.log('\n=== CREATING TEST DATA ===');

            // Create test user
            const testUser = await prisma.user.create({
                data: {
                    id: 'test-user-123',
                    name: 'Test User',
                    email: 'test@example.com',
                    image: 'https://example.com/image.jpg'
                }
            });
            console.log('Created test user:', testUser.id);

            // Create test store
            const testStore = await prisma.store.create({
                data: {
                    userId: testUser.id,
                    name: 'Test Store',
                    username: 'teststore',
                    email: 'store@example.com',
                    address: '123 Test St',
                    contact: '123-456-7890',
                    logo: 'https://example.com/logo.jpg',
                    description: 'Test store for commission testing',
                    status: 'approved',
                    isActive: true
                }
            });
            console.log('Created test store:', testStore.id);

            // Create commission rate
            let commissionRate;
            try {
                commissionRate = await prisma.commissionRate.create({
                    data: {
                        storeId: testStore.id,
                        rate: 10.0, // 10% commission
                        adminUserId: testUser.id
                    }
                });
                console.log('Created commission rate: 10%');
            } catch (error) {
                // Rate might already exist, try to update
                commissionRate = await prisma.commissionRate.update({
                    where: { storeId: testStore.id },
                    data: {
                        rate: 10.0,
                        adminUserId: testUser.id
                    }
                });
                console.log('Updated commission rate: 10%');
            }

            // Create test product
            const testProduct = await prisma.product.create({
                data: {
                    name: 'Test Product',
                    description: 'A test product',
                    mrp: 100.0,
                    price: 80.0,
                    images: ['https://example.com/product.jpg'],
                    category: 'Test',
                    storeId: testStore.id
                }
            });
            console.log('Created test product:', testProduct.id);

            // Create test address
            const testAddress = await prisma.address.create({
                data: {
                    userId: testUser.id,
                    name: 'Test User',
                    email: 'test@example.com',
                    street: '123 Test St',
                    city: 'Test City',
                    state: 'Test State',
                    zip: '12345',
                    country: 'Test Country',
                    phone: '123-456-7890'
                }
            });
            console.log('Created test address:', testAddress.id);

            console.log('\n=== CREATING TEST ORDER ===');

            // Simulate order creation logic
            const items = [{
                id: testProduct.id,
                quantity: 2,
                price: testProduct.price
            }];

            const rate = commissionRate.rate;
            let total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            console.log(`Order total before commission: $${total}`);

            let totalCommission = 0;
            const itemsWithCommission = items.map(item => {
                const itemTotal = item.price * item.quantity;
                const commission = parseFloat((itemTotal * (rate / 100)).toFixed(2));
                totalCommission += commission;
                return {
                    ...item,
                    commissionAmount: commission
                };
            });

            total -= totalCommission;
            console.log(`Order total after commission deduction: $${total}`);
            console.log(`Total commission: $${totalCommission}`);

            // Create the order
            const order = await prisma.order.create({
                data: {
                    userId: testUser.id,
                    storeId: testStore.id,
                    addressId: testAddress.id,
                    total: parseFloat(total.toFixed(2)),
                    totalCommission: parseFloat(totalCommission.toFixed(2)),
                    paymentMethod: 'COD',
                    orderItems: {
                        create: itemsWithCommission.map(item => ({
                            productId: item.id,
                            quantity: item.quantity,
                            price: item.price,
                            commissionAmount: item.commissionAmount
                        }))
                    }
                },
                include: {
                    orderItems: true
                }
            });

            console.log('Created test order:', order.id);
            console.log('Order details:');
            console.log(`- Total: $${order.total}`);
            console.log(`- Commission: $${order.totalCommission}`);
            console.log(`- Commission Paid: ${order.commissionPaid}`);

            order.orderItems.forEach((item, index) => {
                console.log(`- Item ${index + 1}: $${item.price} x ${item.quantity} = $${item.price * item.quantity}, Commission: $${item.commissionAmount}`);
            });
        }

        console.log('\n=== TEST COMPLETE ===');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testCommissionSystem();
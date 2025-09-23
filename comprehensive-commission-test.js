// Comprehensive test script for commission system
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runComprehensiveTests() {
    try {
        console.log('=== COMPREHENSIVE COMMISSION SYSTEM TEST ===\n');

        // Clean up previous test data
        await cleanupTestData();

        // Test 1: Single store order without coupon/shipping
        console.log('--- Test 1: Single Store Order (No Coupon/Shipping) ---');
        await testSingleStoreBasic();

        // Test 2: Single store with coupon
        console.log('\n--- Test 2: Single Store Order with Coupon ---');
        await testSingleStoreWithCoupon();

        // Test 3: Single store with shipping
        console.log('\n--- Test 3: Single Store Order with Shipping ---');
        await testSingleStoreWithShipping();

        // Test 4: Single store with both coupon and shipping
        console.log('\n--- Test 4: Single Store Order with Coupon and Shipping ---');
        await testSingleStoreWithBoth();

        // Test 5: Multi-store order
        console.log('\n--- Test 5: Multi-Store Order ---');
        await testMultiStoreOrder();

        // Test 6: Payout creation and commission paid update
        console.log('\n--- Test 6: Payout Creation ---');
        await testPayoutCreation();

        // Test 7: Dashboard calculations
        console.log('\n--- Test 7: Dashboard Calculations ---');
        await testDashboardCalculations();

        // Test 8: Rounding precision
        console.log('\n--- Test 8: Rounding Precision ---');
        await testRoundingPrecision();

        console.log('\n=== ALL TESTS COMPLETED ===');

    } catch (error) {
        console.error('Test suite failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

async function cleanupTestData() {
    console.log('Cleaning up test data...');
    await prisma.orderItem.deleteMany({ where: { order: { userId: { startsWith: 'test-' } } } });
    await prisma.order.deleteMany({ where: { userId: { startsWith: 'test-' } } });
    await prisma.payout.deleteMany({ where: { store: { userId: { startsWith: 'test-' } } } });
    await prisma.commissionRate.deleteMany({ where: { store: { userId: { startsWith: 'test-' } } } });
    await prisma.product.deleteMany({ where: { store: { userId: { startsWith: 'test-' } } } });
    await prisma.coupon.deleteMany({ where: { code: { startsWith: 'TEST' } } });
    await prisma.store.deleteMany({ where: { userId: { startsWith: 'test-' } } });
    await prisma.address.deleteMany({ where: { userId: { startsWith: 'test-' } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: 'test-' } } });
}

async function createTestUser() {
    return await prisma.user.create({
        data: {
            id: `test-user-${Date.now()}`,
            name: 'Test User',
            email: `test${Date.now()}@example.com`,
            image: 'https://example.com/image.jpg'
        }
    });
}

async function createTestStore(userId, name = 'Test Store', rate = 10) {
    const store = await prisma.store.create({
        data: {
            userId,
            name,
            username: `teststore${Date.now()}`,
            email: `store${Date.now()}@example.com`,
            address: '123 Test St',
            contact: '123-456-7890',
            logo: 'https://example.com/logo.jpg',
            description: 'Test store',
            status: 'approved',
            isActive: true
        }
    });

    await prisma.commissionRate.create({
        data: {
            storeId: store.id,
            rate: rate,
            adminUserId: userId
        }
    });

    return store;
}

async function createTestProduct(storeId, price = 100, name = 'Test Product') {
    return await prisma.product.create({
        data: {
            name,
            description: 'Test product',
            mrp: price + 20,
            price,
            images: ['https://example.com/product.jpg'],
            category: 'Test',
            storeId
        }
    });
}

async function createTestAddress(userId) {
    return await prisma.address.create({
        data: {
            userId,
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
}

async function createTestCoupon(discount = 10, forNewUser = false, forMember = false) {
    return await prisma.coupon.create({
        data: {
            code: `TESTCOUPON${Date.now()}`,
            description: 'Test coupon',
            discount,
            forNewUser,
            forMember,
            isPublic: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
    });
}

async function simulateOrderCreation(userId, addressId, items, couponCode = null, paymentMethod = 'COD', isPlusMember = false) {
    // Group by store
    const ordersByStore = new Map();
    for (const item of items) {
        const product = await prisma.product.findUnique({ where: { id: item.id } });
        const storeId = product.storeId;
        if (!ordersByStore.has(storeId)) {
            ordersByStore.set(storeId, []);
        }
        ordersByStore.get(storeId).push({ ...item, price: product.price, name: product.name });
    }

    // Get commission rates
    const storeIds = Array.from(ordersByStore.keys());
    const commissionRates = await prisma.commissionRate.findMany({
        where: { storeId: { in: storeIds } }
    });
    const rateMap = new Map(commissionRates.map(rate => [rate.storeId, rate.rate]));

    let coupon = null;
    if (couponCode) {
        coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
    }

    const orderIds = [];
    let fullAmount = 0;
    let isShippingFeeAdded = false;

    for (const [storeId, sellerItems] of ordersByStore.entries()) {
        const rate = rateMap.get(storeId);
        let total = sellerItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        // Apply coupon
        if (coupon) {
            const couponDiscount = (total * coupon.discount) / 100;
            total -= couponDiscount;
        }

        // Add shipping
        if (!isPlusMember && !isShippingFeeAdded) {
            total += 5;
            isShippingFeeAdded = true;
        }

        // Calculate commission
        let totalCommission = 0;
        const itemsWithCommission = sellerItems.map(item => {
            const itemTotal = item.price * item.quantity;
            const commission = parseFloat((itemTotal * (rate / 100)).toFixed(2));
            totalCommission += commission;
            return { ...item, commissionAmount: commission };
        });

        total -= totalCommission;
        const roundedTotal = parseFloat(total.toFixed(2));
        fullAmount += roundedTotal;

        const order = await prisma.order.create({
            data: {
                userId,
                storeId,
                addressId,
                total: roundedTotal,
                totalCommission: parseFloat(totalCommission.toFixed(2)),
                paymentMethod,
                currency: 'USD',
                isCouponUsed: coupon ? true : false,
                coupon: coupon ? coupon : {},
                orderItems: {
                    create: itemsWithCommission.map(item => ({
                        productId: item.id,
                        quantity: item.quantity,
                        price: item.price,
                        currency: 'USD',
                        commissionAmount: item.commissionAmount
                    }))
                }
            }
        });
        orderIds.push(order.id);
    }

    return { orderIds, fullAmount };
}

async function testSingleStoreBasic() {
    const user = await createTestUser();
    const store = await createTestStore(user.id);
    const product = await createTestProduct(store.id, 100);
    const address = await createTestAddress(user.id);

    const items = [{ id: product.id, quantity: 2 }];
    const result = await simulateOrderCreation(user.id, address.id, items, null, 'COD', true); // Plus member, no shipping

    const order = await prisma.order.findFirst({
        where: { id: result.orderIds[0] },
        include: { orderItems: true }
    });

    console.log(`Order Total: $${order.total} (Expected: $180)`);
    console.log(`Commission: $${order.totalCommission} (Expected: $20)`);
    console.log(`Items: ${order.orderItems.length}, Total value: $${order.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)}`);

    // Assertions
    if (Math.abs(order.total - 180) > 0.01) throw new Error('Total mismatch');
    if (Math.abs(order.totalCommission - 20) > 0.01) throw new Error('Commission mismatch');
}

async function testSingleStoreWithCoupon() {
    const user = await createTestUser();
    const store = await createTestStore(user.id);
    const product = await createTestProduct(store.id, 100);
    const address = await createTestAddress(user.id);
    const coupon = await createTestCoupon(10); // 10% discount

    const items = [{ id: product.id, quantity: 2 }];
    const result = await simulateOrderCreation(user.id, address.id, items, coupon.code, 'COD', true); // Plus member, no shipping

    const order = await prisma.order.findFirst({
        where: { id: result.orderIds[0] },
        include: { orderItems: true }
    });

    console.log(`Order Total: $${order.total} (Expected: $160)`);
    console.log(`Commission: $${order.totalCommission} (Expected: $20)`);

    // Subtotal 200, discount 20 = 180, commission 20, final 160
    if (Math.abs(order.total - 160) > 0.01) throw new Error('Total mismatch with coupon');
    if (Math.abs(order.totalCommission - 20) > 0.01) throw new Error('Commission mismatch with coupon');
}

async function testSingleStoreWithShipping() {
    const user = await createTestUser();
    const store = await createTestStore(user.id);
    const product = await createTestProduct(store.id, 100);
    const address = await createTestAddress(user.id);

    const items = [{ id: product.id, quantity: 2 }];
    const result = await simulateOrderCreation(user.id, address.id, items, null, 'COD', false); // Not plus member

    const order = await prisma.order.findFirst({
        where: { id: result.orderIds[0] },
        include: { orderItems: true }
    });

    console.log(`Order Total: $${order.total} (Expected: $185)`);
    console.log(`Commission: $${order.totalCommission} (Expected: $20)`);

    // Subtotal 200, shipping 5 = 205, commission 20, final 185
    if (Math.abs(order.total - 185) > 0.01) throw new Error('Total mismatch with shipping');
    if (Math.abs(order.totalCommission - 20) > 0.01) throw new Error('Commission mismatch with shipping');
}

async function testSingleStoreWithBoth() {
    const user = await createTestUser();
    const store = await createTestStore(user.id);
    const product = await createTestProduct(store.id, 100);
    const address = await createTestAddress(user.id);
    const coupon = await createTestCoupon(10);

    const items = [{ id: product.id, quantity: 2 }];
    const result = await simulateOrderCreation(user.id, address.id, items, coupon.code, 'COD', false);

    const order = await prisma.order.findFirst({
        where: { id: result.orderIds[0] },
        include: { orderItems: true }
    });

    console.log(`Order Total: $${order.total} (Expected: $165)`);
    console.log(`Commission: $${order.totalCommission} (Expected: $20)`);

    // Subtotal 200, discount 20 = 180, shipping 5 = 185, commission 20, final 165
    if (Math.abs(order.total - 165) > 0.01) throw new Error('Total mismatch with coupon and shipping');
    if (Math.abs(order.totalCommission - 20) > 0.01) throw new Error('Commission mismatch with coupon and shipping');
}

async function testMultiStoreOrder() {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const store1 = await createTestStore(user1.id, 'Store 1', 10);
    const store2 = await createTestStore(user2.id, 'Store 2', 15);
    const product1 = await createTestProduct(store1.id, 100, 'Product 1');
    const product2 = await createTestProduct(store2.id, 50, 'Product 2');
    const address = await createTestAddress(user1.id);

    const items = [
        { id: product1.id, quantity: 1 },
        { id: product2.id, quantity: 2 }
    ];
    const result = await simulateOrderCreation(user1.id, address.id, items, null, 'COD', true); // Plus member, no shipping

    const orders = await prisma.order.findMany({
        where: { id: { in: result.orderIds } },
        include: { orderItems: true, store: true }
    });

    console.log(`Created ${orders.length} orders`);
    orders.forEach(order => {
        console.log(`Store: ${order.store.name}, Total: $${order.total}, Commission: $${order.totalCommission}`);
    });

    // Store 1: 100, commission 10, total 90
    // Store 2: 100, commission 15, total 85
    const order1 = orders.find(o => o.storeId === store1.id);
    const order2 = orders.find(o => o.storeId === store2.id);

    if (Math.abs(order1.total - 90) > 0.01) throw new Error('Store 1 total mismatch');
    if (Math.abs(order1.totalCommission - 10) > 0.01) throw new Error('Store 1 commission mismatch');
    if (Math.abs(order2.total - 85) > 0.01) throw new Error('Store 2 total mismatch');
    if (Math.abs(order2.totalCommission - 15) > 0.01) throw new Error('Store 2 commission mismatch');
}

async function testPayoutCreation() {
    // Use existing test data from previous tests
    const stores = await prisma.store.findMany({
        where: { userId: { startsWith: 'test-' } },
        include: {
            Order: {
                where: { commissionPaid: false, totalCommission: { gt: 0 } }
            }
        }
    });

    if (stores.length === 0) {
        console.log('No test stores with unpaid commissions found');
        return;
    }

    const store = stores[0];
    const totalUnpaid = store.Order.reduce((sum, order) => sum + order.totalCommission, 0);

    console.log(`Testing payout for ${store.name}, unpaid commission: $${totalUnpaid}`);

    // Simulate payout creation (call the API logic)
    const payout = await prisma.payout.create({
        data: {
            storeId: store.id,
            amount: totalUnpaid
        }
    });

    // Update orders
    await prisma.order.updateMany({
        where: {
            storeId: store.id,
            commissionPaid: false,
            totalCommission: { gt: 0 }
        },
        data: { commissionPaid: true }
    });

    console.log(`Created payout: $${payout.amount}`);

    // Verify
    const updatedOrders = await prisma.order.findMany({
        where: { storeId: store.id }
    });

    const stillUnpaid = updatedOrders.filter(o => !o.commissionPaid && o.totalCommission > 0);
    if (stillUnpaid.length > 0) throw new Error('Some orders still unpaid after payout');

    console.log('All orders marked as paid');
}

async function testDashboardCalculations() {
    const stores = await prisma.store.findMany({
        where: { userId: { startsWith: 'test-' } }
    });

    if (stores.length === 0) return;

    const store = stores[0];

    const orders = await prisma.order.findMany({
        where: { storeId: store.id },
        include: { orderItems: true }
    });

    const grossEarnings = orders.reduce((acc, order) =>
        acc + order.orderItems.reduce((itemAcc, item) => itemAcc + (item.price * item.quantity), 0), 0
    );

    const totalCommissions = orders.reduce((acc, order) => acc + order.totalCommission, 0);
    const netEarnings = grossEarnings - totalCommissions;
    const totalCommissionsPaid = orders
        .filter(order => order.commissionPaid)
        .reduce((acc, order) => acc + order.totalCommission, 0);

    console.log(`Gross Earnings: $${grossEarnings}`);
    console.log(`Total Commissions: $${totalCommissions}`);
    console.log(`Net Earnings: $${netEarnings}`);
    console.log(`Commissions Paid: $${totalCommissionsPaid}`);

    // Basic sanity check
    if (netEarnings < 0) throw new Error('Negative net earnings');
}

async function testRoundingPrecision() {
    const user = await createTestUser();
    const store = await createTestStore(user.id, 'Precision Store', 10.5); // Fractional rate
    const product = await createTestProduct(store.id, 33.33); // Fractional price
    const address = await createTestAddress(user.id);

    const items = [{ id: product.id, quantity: 3 }];
    const result = await simulateOrderCreation(user.id, address.id, items, null, 'COD', true); // Plus member, no shipping

    const order = await prisma.order.findFirst({
        where: { id: result.orderIds[0] },
        include: { orderItems: true }
    });

    console.log(`Order Total: $${order.total}`);
    console.log(`Commission: $${order.totalCommission}`);

    // 33.33 * 3 = 99.99, commission 99.99 * 0.105 = 10.49895, rounded to 10.50
    // Total: 99.99 - 10.50 = 89.49
    const expectedCommission = parseFloat((99.99 * 0.105).toFixed(2));
    const expectedTotal = 99.99 - expectedCommission;

    console.log(`Expected Commission: $${expectedCommission}, Expected Total: $${expectedTotal}`);

    if (Math.abs(order.totalCommission - expectedCommission) > 0.01) throw new Error('Precision error in commission');
    if (Math.abs(order.total - expectedTotal) > 0.01) throw new Error('Precision error in total');
}

runComprehensiveTests();
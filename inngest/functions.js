import {inngest} from './client'
import prisma from '@/lib/prisma'

// Inngest Function to save user data to a database
export const syncUserCreation = inngest.createFunction(
    {id: 'sync-user-create'},
    {event: 'clerk/user.created'},
    async ({ event }) => {
        const {data} = event
        await prisma.user.create({
            data: {
                id: data.id,
                email: data.email_addresses[0].email_address,
                name: `${data.first_name} ${data.last_name}`,
                image: data.image_url,
            }
        })
    }
)

// Inngest Function to update user data in database 
export const syncUserUpdation = inngest.createFunction(
    {id: 'sync-user-update'},
    { event: 'clerk/user.updated' },
    async ({ event }) => {
        const { data } = event
        await prisma.user.update({
            where: {id: data.id,},
            data: {
                email: data.email_addresses[0].email_address,
                name: `${data.first_name} ${data.last_name}`,
                image: data.image_url,
            }
        })
    }
)

// Inngest Function to delete user from database
export const syncUserDeletion = inngest.createFunction(
    {id: 'sync-user-delete'},
    { event: 'clerk/user.deleted' },
    async ({ event }) => {
        const { data } = event
        await prisma.user.delete({
            where: {id: data.id,}
        })
    }
)

// Inngest Function to delete coupon on expiry
export const deleteCouponOnExpiry = inngest.createFunction(
    {id: 'delete-coupon-on-expiry'},
    { event: 'app/coupon.expired' },
    async ({ event, step }) => {
        const { data } = event
        const expiryDate = new Date(data.expires_at)
        await step.sleepUntil('wait-for-expiry', expiryDate)

        await step.run('delete-coupon-from-database', async () => {
            await prisma.coupon.delete({
                where: { code: data.code }
            })
        })
    }
)

// Inngest Function for nightly financial calculations
export const nightlyFinancialAggregation = inngest.createFunction(
    {id: 'nightly-financial-aggregation'},
    { event: 'app/financials.aggregate' },
    async ({ event, step }) => {
        // Get all stores
        const stores = await step.run('get-all-stores', async () => {
            return await prisma.store.findMany({
                where: { isActive: true },
                select: { id: true, userId: true }
            })
        })

        // Process each store's financials
        for (const store of stores) {
            await step.run(`aggregate-store-${store.id}`, async () => {
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
                const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)

                // Get orders for yesterday
                const orders = await prisma.order.findMany({
                    where: {
                        storeId: store.id,
                        createdAt: {
                            gte: startOfDay,
                            lte: endOfDay
                        },
                        status: {
                            in: ['DELIVERED', 'PROCESSING', 'SHIPPED']
                        }
                    },
                    include: {
                        orderItems: true
                    }
                })

                if (orders.length === 0) return // No orders yesterday

                // Calculate daily metrics
                const totalSales = orders.reduce((sum, order) => sum + order.total, 0)
                const orderCount = orders.length
                const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0
                const unitsSold = orders.reduce((sum, order) =>
                    sum + order.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
                )
                const totalCommissions = orders.reduce((sum, order) => sum + order.totalCommission, 0)
                const netRevenue = totalSales - totalCommissions

                // Get or create vendor financials
                let vendorFinancials = await prisma.vendorFinancial.findUnique({
                    where: { storeId: store.id }
                })

                if (!vendorFinancials) {
                    vendorFinancials = await prisma.vendorFinancial.create({
                        data: { storeId: store.id }
                    })
                }

                // Create or update daily summary
                await prisma.dailyFinancialSummary.upsert({
                    where: {
                        storeId_date: {
                            storeId: store.id,
                            date: startOfDay
                        }
                    },
                    update: {
                        totalSales,
                        orderCount,
                        averageOrderValue,
                        unitsSold,
                        grossRevenue: totalSales,
                        netRevenue,
                        totalCommissions,
                        updatedAt: new Date()
                    },
                    create: {
                        storeId: store.id,
                        vendorFinancialId: vendorFinancials.id,
                        date: startOfDay,
                        totalSales,
                        orderCount,
                        averageOrderValue,
                        unitsSold,
                        grossRevenue: totalSales,
                        netRevenue,
                        totalCommissions
                    }
                })

                // Create commission breakdowns
                const commissionRate = await prisma.commissionRate.findUnique({
                    where: { storeId: store.id }
                })

                for (const order of orders) {
                    if (order.totalCommission > 0) {
                        const dailySummary = await prisma.dailyFinancialSummary.findUnique({
                            where: {
                                storeId_date: {
                                    storeId: store.id,
                                    date: startOfDay
                                }
                            }
                        })

                        if (dailySummary) {
                            await prisma.commissionBreakdown.create({
                                data: {
                                    dailySummaryId: dailySummary.id,
                                    orderId: order.id,
                                    commissionType: 'platform',
                                    commissionRate: commissionRate?.rate || 0,
                                    commissionAmount: order.totalCommission,
                                    baseAmount: order.total
                                }
                            })
                        }
                    }
                }

                // Update vendor financials totals
                await prisma.vendorFinancial.update({
                    where: { storeId: store.id },
                    data: {
                        totalSales: {
                            increment: totalSales
                        },
                        totalCommissions: {
                            increment: totalCommissions
                        },
                        currentBalance: {
                            increment: netRevenue
                        },
                        lastCalculated: new Date(),
                        updatedAt: new Date()
                    }
                })
            })
        }

        return { processedStores: stores.length }
    }
)

// Inngest Function for nightly analytics aggregation
export const nightlyAnalyticsAggregation = inngest.createFunction(
    {id: 'nightly-analytics-aggregation'},
    { event: 'app/analytics.aggregate' },
    async ({ event, step }) => {
        // Get all stores
        const stores = await step.run('get-all-stores-analytics', async () => {
            return await prisma.store.findMany({
                where: { isActive: true },
                select: { id: true, userId: true }
            })
        })

        // Process each store's analytics
        for (const store of stores) {
            await step.run(`aggregate-analytics-${store.id}`, async () => {
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
                const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)

                // Get orders for yesterday
                const orders = await prisma.order.findMany({
                    where: {
                        storeId: store.id,
                        createdAt: {
                            gte: startOfDay,
                            lte: endOfDay
                        }
                    },
                    include: {
                        orderItems: true,
                        returns: true
                    }
                })

                // Get ratings for yesterday
                const ratings = await prisma.rating.findMany({
                    where: {
                        product: { storeId: store.id },
                        createdAt: {
                            gte: startOfDay,
                            lte: endOfDay
                        }
                    }
                })

                // Get shipments for fulfillment time calculation
                const shipments = await prisma.shipment.findMany({
                    where: {
                        order: { storeId: store.id },
                        shippedAt: {
                            gte: startOfDay,
                            lte: endOfDay
                        }
                    },
                    include: { order: true }
                })

                // Calculate metrics
                const totalOrders = orders.length
                const totalVisitors = await estimateVisitors(store.id, startOfDay, endOfDay) // Placeholder
                const conversionRate = totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : 0

                const totalReturns = orders.reduce((sum, order) => sum + order.returns.length, 0)
                const returnRate = totalOrders > 0 ? (totalReturns / totalOrders) * 100 : 0

                const fulfillmentTimes = shipments
                    .filter(s => s.deliveredAt && s.order.createdAt)
                    .map(s => (new Date(s.deliveredAt) - new Date(s.order.createdAt)) / (1000 * 60 * 60)) // hours

                const avgFulfillmentTime = fulfillmentTimes.length > 0
                    ? fulfillmentTimes.reduce((sum, time) => sum + time, 0) / fulfillmentTimes.length
                    : 0

                const avgRating = ratings.length > 0
                    ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
                    : 0

                // Estimate cart abandonment (simplified)
                const cartAbandonmentRate = Math.random() * 30 + 20 // 20-50% range for demo

                // Get inventory alerts
                const lowStockProducts = await prisma.product.count({
                    where: {
                        storeId: store.id,
                        stock: { lte: 5 }
                    }
                })

                // Get top search terms (simplified - in real app, this would come from search logs)
                const topSearchTerms = [
                    { term: 'electronics', count: Math.floor(Math.random() * 100) + 50 },
                    { term: 'gadgets', count: Math.floor(Math.random() * 80) + 30 },
                    { term: 'accessories', count: Math.floor(Math.random() * 60) + 20 }
                ]

                // Create or update analytics data
                await prisma.analyticsData.upsert({
                    where: {
                        storeId_date: {
                            storeId: store.id,
                            date: startOfDay
                        }
                    },
                    update: {
                        conversionRate,
                        returnRate,
                        fulfillmentTime: avgFulfillmentTime,
                        customerRating: avgRating,
                        totalVisitors,
                        totalOrders,
                        cartAbandonmentRate,
                        topSearchTerms,
                        inventoryLowAlerts: lowStockProducts,
                        updatedAt: new Date()
                    },
                    create: {
                        storeId: store.id,
                        date: startOfDay,
                        conversionRate,
                        returnRate,
                        fulfillmentTime: avgFulfillmentTime,
                        customerRating: avgRating,
                        totalVisitors,
                        totalOrders,
                        cartAbandonmentRate,
                        topSearchTerms,
                        inventoryLowAlerts: lowStockProducts
                    }
                })

                // Create customer behavior data
                const topProducts = await prisma.product.findMany({
                    where: { storeId: store.id },
                    select: { id: true, name: true },
                    take: 5
                })

                const topProductViews = topProducts.map(product => ({
                    id: product.id,
                    name: product.name,
                    views: Math.floor(Math.random() * 200) + 50
                }))

                await prisma.customerBehavior.upsert({
                    where: {
                        storeId_date: {
                            storeId: store.id,
                            date: startOfDay
                        }
                    },
                    update: {
                        searchTerms: topSearchTerms,
                        cartAbandonments: Math.floor(totalOrders * cartAbandonmentRate / 100),
                        abandonedCartValue: Math.floor(totalOrders * cartAbandonmentRate / 100 * 50), // Estimate $50 avg cart
                        topProductViews,
                        updatedAt: new Date()
                    },
                    create: {
                        storeId: store.id,
                        date: startOfDay,
                        searchTerms: topSearchTerms,
                        cartAbandonments: Math.floor(totalOrders * cartAbandonmentRate / 100),
                        abandonedCartValue: Math.floor(totalOrders * cartAbandonmentRate / 100 * 50),
                        topProductViews
                    }
                })

                // Check and trigger alerts
                await checkAndTriggerAlerts(store.id, {
                    conversionRate,
                    returnRate,
                    inventoryLowAlerts: lowStockProducts
                })
            })
        }

        return { processedStores: stores.length }
    }
)

// Helper function to estimate visitors (simplified)
async function estimateVisitors(storeId, startDate, endDate) {
    // In a real implementation, this would come from web analytics
    // For demo purposes, we'll estimate based on orders
    const orderCount = await prisma.order.count({
        where: {
            storeId,
            createdAt: { gte: startDate, lte: endDate }
        }
    })

    // Assume conversion rate of 2-5%
    return Math.floor(orderCount / (Math.random() * 0.03 + 0.02))
}

// Helper function to check and trigger alerts
async function checkAndTriggerAlerts(storeId, metrics) {
    const alerts = await prisma.analyticsAlert.findMany({
        where: {
            storeId,
            isActive: true
        }
    })

    for (const alert of alerts) {
        let shouldTrigger = false
        let currentValue = 0

        switch (alert.type) {
            case 'inventory_low':
                currentValue = metrics.inventoryLowAlerts
                shouldTrigger = currentValue >= alert.threshold
                break
            case 'high_return_rate':
                currentValue = metrics.returnRate
                shouldTrigger = currentValue >= alert.threshold
                break
            case 'low_conversion':
                currentValue = metrics.conversionRate
                shouldTrigger = currentValue <= alert.threshold
                break
        }

        if (shouldTrigger) {
            // Update alert with current value and last triggered
            await prisma.analyticsAlert.update({
                where: { id: alert.id },
                data: {
                    currentValue,
                    lastTriggered: new Date()
                }
            })

            // In a real implementation, you might send notifications here
            console.log(`Alert triggered for store ${storeId}: ${alert.type} - ${alert.message}`)
        }
    }
}

// Inngest Function to handle order status updates and notifications
export const handleOrderStatusUpdate = inngest.createFunction(
    {id: 'order-status-update'},
    { event: 'app/order.status.updated' },
    async ({ event, step }) => {
        const { orderId, oldStatus, newStatus, storeId, userId } = event.data

        // Send notification to customer
        await step.run('send-customer-notification', async () => {
            const { sendNotification } = await import('@/lib/notifications')
            await sendNotification('order_status_update', {
                userId,
                orderId,
                status: newStatus,
                message: `Your order status has been updated to ${newStatus.replace('_', ' ').toLowerCase()}`
            })
        })

        // Send notification to vendor
        await step.run('send-vendor-notification', async () => {
            const { sendNotification } = await import('@/lib/notifications')
            await sendNotification('vendor_order_update', {
                storeId,
                orderId,
                status: newStatus,
                message: `Order ${orderId.slice(-8)} status updated to ${newStatus.replace('_', ' ').toLowerCase()}`
            })
        })

        // Handle specific status changes
        if (newStatus === 'SHIPPED') {
            await step.run('create-shipment-tracking', async () => {
                // Additional shipment tracking logic could go here
            })
        }

        if (newStatus === 'DELIVERED') {
            await step.run('update-commission-status', async () => {
                // Mark commission as paid when order is delivered
                const order = await prisma.order.findUnique({
                    where: { id: orderId },
                    include: { orderItems: true }
                })

                if (order) {
                    await prisma.order.update({
                        where: { id: orderId },
                        data: { commissionPaid: true }
                    })
                }
            })
        }
    }
)

// Inngest Function to handle return requests
export const handleReturnRequest = inngest.createFunction(
    {id: 'return-request-created'},
    { event: 'app/return.requested' },
    async ({ event, step }) => {
        const { returnId, orderId, storeId, userId, reason } = event.data

        // Send notification to vendor
        await step.run('notify-vendor-return', async () => {
            const { sendNotification } = await import('@/lib/notifications')
            await sendNotification('vendor_return_request', {
                storeId,
                returnId,
                orderId,
                reason,
                message: `New return request for order ${orderId.slice(-8)}: ${reason}`
            })
        })
    }
)

// Inngest Function to handle return status updates
export const handleReturnStatusUpdate = inngest.createFunction(
    {id: 'return-status-update'},
    { event: 'app/return.status.updated' },
    async ({ event, step }) => {
        const { returnId, orderId, oldStatus, newStatus, storeId, userId } = event.data

        // Send notification to customer
        await step.run('notify-customer-return', async () => {
            const { sendNotification } = await import('@/lib/notifications')
            let message = `Your return request status has been updated to ${newStatus.replace('_', ' ').toLowerCase()}`

            if (newStatus === 'REFUNDED') {
                message = 'Your return has been processed and refund has been issued'
            }

            await sendNotification('return_status_update', {
                userId,
                returnId,
                orderId,
                status: newStatus,
                message
            })
        })

        // Send notification to vendor
        await step.run('notify-vendor-return-update', async () => {
            const { sendNotification } = await import('@/lib/notifications')
            await sendNotification('vendor_return_update', {
                storeId,
                returnId,
                orderId,
                status: newStatus,
                message: `Return ${returnId.slice(-8)} status updated to ${newStatus.replace('_', ' ').toLowerCase()}`
            })
        })
    }
)
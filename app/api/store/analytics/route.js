import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request) {
    try {
        // Rate limiting
        const rateLimitResult = await rateLimit(request, 50, 60 * 1000) // 50 requests per minute
        if (rateLimitResult) return rateLimitResult

        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get store info
        const store = await prisma.store.findUnique({
            where: { userId },
            select: { id: true, name: true }
        })

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Get latest analytics data
        const analyticsData = await prisma.analyticsData.findFirst({
            where: { storeId: store.id },
            orderBy: { date: 'desc' }
        })

        // Get customer behavior data
        const customerBehavior = await prisma.customerBehavior.findFirst({
            where: { storeId: store.id },
            orderBy: { date: 'desc' }
        })

        // Get benchmarking data (anonymized)
        const categoryBenchmarks = await getAnonymizedBenchmarks(store.id)

        // Get alerts
        const alerts = await prisma.analyticsAlert.findMany({
            where: {
                storeId: store.id,
                isActive: true
            }
        })

        // Get recent revenue trend (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const revenueTrend = await prisma.dailyFinancialSummary.findMany({
            where: {
                storeId: store.id,
                date: { gte: thirtyDaysAgo }
            },
            select: {
                date: true,
                totalSales: true,
                orderCount: true
            },
            orderBy: { date: 'asc' }
        })

        // Format response
        const response = {
            conversionRate: analyticsData?.conversionRate || 0,
            returnRate: analyticsData?.returnRate || 0,
            fulfillmentTime: analyticsData?.fulfillmentTime || 0,
            customerRating: analyticsData?.customerRating || 0,
            conversionChange: calculateChange(analyticsData?.conversionRate, await getPreviousValue(store.id, 'conversionRate')),
            returnChange: calculateChange(analyticsData?.returnRate, await getPreviousValue(store.id, 'returnRate')),
            fulfillmentChange: calculateChange(analyticsData?.fulfillmentTime, await getPreviousValue(store.id, 'fulfillmentTime')),
            ratingChange: calculateChange(analyticsData?.customerRating, await getPreviousValue(store.id, 'customerRating')),
            revenueTrend: revenueTrend.map(item => ({
                date: item.date.toISOString().split('T')[0],
                revenue: item.totalSales,
                orders: item.orderCount
            })),
            orderVolume: revenueTrend.map(item => ({
                date: item.date.toISOString().split('T')[0],
                orders: item.orderCount
            })),
            customerBehavior: {
                searchTerms: customerBehavior?.searchTerms || [],
                cartAbandonment: {
                    rate: analyticsData?.cartAbandonmentRate || 0,
                    completed: Math.round((analyticsData?.totalOrders || 0) * (1 - (analyticsData?.cartAbandonmentRate || 0) / 100)),
                    abandoned: Math.round((analyticsData?.totalOrders || 0) * (analyticsData?.cartAbandonmentRate || 0) / 100)
                },
                topProducts: customerBehavior?.topProductViews || []
            },
            benchmarking: {
                categoryBenchmarks,
                categoryConversionAvg: await getCategoryAverage('conversionRate'),
                categoryReturnAvg: await getCategoryAverage('returnRate'),
                categoryRatingAvg: await getCategoryAverage('customerRating'),
                categoryFulfillmentAvg: await getCategoryAverage('fulfillmentTime')
            },
            alerts
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Analytics API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

async function getPreviousValue(storeId, metric) {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const previousData = await prisma.analyticsData.findFirst({
        where: {
            storeId,
            date: { lte: twoDaysAgo }
        },
        orderBy: { date: 'desc' }
    })

    return previousData?.[metric] || 0
}

function calculateChange(current, previous) {
    if (!previous || previous === 0) return 0
    return ((current - previous) / previous) * 100
}

async function getAnonymizedBenchmarks(storeId) {
    // Get category from store's products
    const storeProducts = await prisma.product.findMany({
        where: { storeId },
        select: { category: true }
    })

    if (storeProducts.length === 0) return []

    const category = storeProducts[0].category

    // Get anonymized averages for the category (excluding current store)
    const categoryData = await prisma.analyticsData.findMany({
        where: {
            store: {
                Product: {
                    some: { category }
                }
            },
            storeId: { not: storeId }
        },
        select: {
            conversionRate: true,
            returnRate: true,
            customerRating: true,
            fulfillmentTime: true
        }
    })

    if (categoryData.length === 0) return []

    const averages = {
        conversionRate: categoryData.reduce((sum, item) => sum + (item.conversionRate || 0), 0) / categoryData.length,
        returnRate: categoryData.reduce((sum, item) => sum + (item.returnRate || 0), 0) / categoryData.length,
        customerRating: categoryData.reduce((sum, item) => sum + (item.customerRating || 0), 0) / categoryData.length,
        fulfillmentTime: categoryData.reduce((sum, item) => sum + (item.fulfillmentTime || 0), 0) / categoryData.length
    }

    return [{
        category,
        yourStore: await getStoreAverages(storeId),
        categoryAvg: averages
    }]
}

async function getStoreAverages(storeId) {
    const storeData = await prisma.analyticsData.findFirst({
        where: { storeId },
        orderBy: { date: 'desc' }
    })

    return {
        conversionRate: storeData?.conversionRate || 0,
        returnRate: storeData?.returnRate || 0,
        customerRating: storeData?.customerRating || 0,
        fulfillmentTime: storeData?.fulfillmentTime || 0
    }
}

async function getCategoryAverage(metric) {
    const result = await prisma.analyticsData.aggregate({
        _avg: { [metric]: true },
        where: {
            [metric]: { not: null }
        }
    })

    return result._avg[metric] || 0
}
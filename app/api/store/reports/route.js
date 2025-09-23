import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request) {
    try {
        // Rate limiting
        const rateLimitResult = await rateLimit(request, 30, 60 * 1000) // 30 requests per minute
        if (rateLimitResult) return rateLimitResult

        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get store info
        const store = await prisma.store.findUnique({
            where: { userId },
            select: { id: true }
        })

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Get reports
        const reports = await prisma.customReport.findMany({
            where: { storeId: store.id },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(reports)
    } catch (error) {
        console.error('Reports API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        // Rate limiting
        const rateLimitResult = await rateLimit(request, 10, 60 * 1000) // 10 requests per minute
        if (rateLimitResult) return rateLimitResult

        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { metrics, timeframe, startDate, endDate } = body

        // Get store info
        const store = await prisma.store.findUnique({
            where: { userId },
            select: { id: true, name: true }
        })

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Generate report data
        const reportData = await generateReportData(store.id, metrics, timeframe, startDate, endDate)

        // Create CSV content
        const csvContent = generateCSV(metrics, reportData)

        // Create report record
        const report = await prisma.customReport.create({
            data: {
                storeId: store.id,
                name: `${store.name} Analytics Report - ${new Date().toLocaleDateString()}`,
                description: `Custom report with metrics: ${metrics.join(', ')}`,
                metrics,
                timeframe,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                fileUrl: null, // In a real implementation, you'd upload the CSV to cloud storage
                status: 'completed'
            }
        })

        return NextResponse.json({
            ...report,
            data: reportData,
            csvContent
        })
    } catch (error) {
        console.error('Reports API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

async function generateReportData(storeId, metrics, timeframe, startDate, endDate) {
    let dateFilter = {}
    const now = new Date()

    if (timeframe === 'custom' && startDate && endDate) {
        dateFilter = {
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        }
    } else {
        const days = timeframe === 'daily' ? 1 : timeframe === 'weekly' ? 7 : timeframe === 'monthly' ? 30 : 365
        const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        dateFilter = { date: { gte: start } }
    }

    const data = await prisma.analyticsData.findMany({
        where: {
            storeId,
            ...dateFilter
        },
        orderBy: { date: 'asc' }
    })

    const financialData = await prisma.dailyFinancialSummary.findMany({
        where: {
            storeId,
            ...dateFilter
        },
        orderBy: { date: 'asc' }
    })

    const reportData = data.map(item => {
        const financial = financialData.find(f => f.date.toDateString() === item.date.toDateString())

        const row = {
            date: item.date.toISOString().split('T')[0]
        }

        if (metrics.includes('revenue')) {
            row.revenue = financial?.grossRevenue || 0
        }
        if (metrics.includes('orders')) {
            row.orders = financial?.orderCount || 0
        }
        if (metrics.includes('conversion')) {
            row.conversionRate = item.conversionRate || 0
        }
        if (metrics.includes('returns')) {
            row.returnRate = item.returnRate || 0
        }
        if (metrics.includes('fulfillment')) {
            row.fulfillmentTime = item.fulfillmentTime || 0
        }
        if (metrics.includes('rating')) {
            row.customerRating = item.customerRating || 0
        }
        if (metrics.includes('abandonment')) {
            row.cartAbandonment = item.cartAbandonmentRate || 0
        }
        if (metrics.includes('inventory')) {
            row.inventoryAlerts = item.inventoryLowAlerts || 0
        }

        return row
    })

    return reportData
}

function generateCSV(metrics, data) {
    const headers = ['Date', ...metrics.map(m => {
        const headerMap = {
            revenue: 'Revenue',
            orders: 'Orders',
            conversion: 'Conversion Rate (%)',
            returns: 'Return Rate (%)',
            fulfillment: 'Fulfillment Time (hours)',
            rating: 'Customer Rating',
            abandonment: 'Cart Abandonment (%)',
            inventory: 'Inventory Alerts'
        }
        return headerMap[m] || m
    })]

    const csvRows = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                if (header === 'Date') return row.date
                const metricKey = Object.keys(row).find(key =>
                    headers.includes(header) &&
                    header.toLowerCase().includes(key.toLowerCase().replace('rate', '').replace('time', '').replace('abandonment', ''))
                )
                return row[metricKey] || 0
            }).join(',')
        )
    ]

    return csvRows.join('\n')
}
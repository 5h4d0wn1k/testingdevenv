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

        // Get alerts
        const alerts = await prisma.analyticsAlert.findMany({
            where: { storeId: store.id },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(alerts)
    } catch (error) {
        console.error('Alerts API error:', error)
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
        const { type, threshold, message } = body

        // Get store info
        const store = await prisma.store.findUnique({
            where: { userId },
            select: { id: true }
        })

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Get current value for the metric
        const currentValue = await getCurrentMetricValue(store.id, type)

        // Create alert
        const alert = await prisma.analyticsAlert.create({
            data: {
                storeId: store.id,
                type,
                threshold,
                currentValue,
                message: message || generateDefaultMessage(type, threshold),
                isActive: true
            }
        })

        return NextResponse.json(alert)
    } catch (error) {
        console.error('Alerts API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(request) {
    try {
        const url = new URL(request.url)
        const alertId = url.pathname.split('/').pop()

        // Rate limiting
        const rateLimitResult = await rateLimit(request, 20, 60 * 1000) // 20 requests per minute
        if (rateLimitResult) return rateLimitResult

        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { threshold, isActive } = body

        // Get store info
        const store = await prisma.store.findUnique({
            where: { userId },
            select: { id: true }
        })

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Update alert
        const alert = await prisma.analyticsAlert.updateMany({
            where: {
                id: alertId,
                storeId: store.id
            },
            data: {
                threshold,
                isActive,
                updatedAt: new Date()
            }
        })

        if (alert.count === 0) {
            return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Alerts API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

async function getCurrentMetricValue(storeId, type) {
    const analyticsData = await prisma.analyticsData.findFirst({
        where: { storeId },
        orderBy: { date: 'desc' }
    })

    switch (type) {
        case 'inventory_low':
            // Count products with low stock
            const lowStockProducts = await prisma.product.count({
                where: {
                    storeId,
                    stock: { lte: 5 } // Assuming 5 is low threshold
                }
            })
            return lowStockProducts

        case 'high_return_rate':
            return analyticsData?.returnRate || 0

        case 'low_conversion':
            return analyticsData?.conversionRate || 0

        default:
            return 0
    }
}

function generateDefaultMessage(type, threshold) {
    switch (type) {
        case 'inventory_low':
            return `Inventory level has dropped below ${threshold} units`
        case 'high_return_rate':
            return `Return rate has exceeded ${threshold}%`
        case 'low_conversion':
            return `Conversion rate has dropped below ${threshold}%`
        default:
            return `Alert threshold of ${threshold} has been reached`
    }
}
import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Create refund
export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { orderId, amount, reason } = await request.json()

        // Validate required fields
        if (!orderId || !amount || !reason) {
            return NextResponse.json({ error: 'Order ID, amount, and reason are required' }, { status: 400 })
        }

        // Check if order belongs to store
        const order = await prisma.order.findFirst({
            where: { id: orderId, storeId }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Create refund record
        const refund = await prisma.refund.create({
            data: {
                orderId,
                amount: parseFloat(amount),
                reason,
                status: 'pending'
            }
        })

        // Update order status to refunded
        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'REFUNDED' }
        })

        // TODO: Integrate with Stripe for actual refund processing
        // This would involve calling Stripe's refund API

        return NextResponse.json({
            message: "Refund created successfully",
            refund
        })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get refunds for store orders
export async function GET(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const orderId = searchParams.get('orderId')
        const status = searchParams.get('status')

        const where = orderId ? { orderId, order: { storeId } } : { order: { storeId } }

        if (status && status !== 'all') {
            where.status = status
        }

        const refunds = await prisma.refund.findMany({
            where,
            include: {
                order: {
                    include: {
                        user: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ refunds })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Update refund status
export async function PUT(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { refundId, status } = await request.json()

        if (!refundId || !status) {
            return NextResponse.json({ error: 'Refund ID and status are required' }, { status: 400 })
        }

        // Check if refund belongs to store
        const refund = await prisma.refund.findFirst({
            where: { id: refundId, order: { storeId } }
        })

        if (!refund) {
            return NextResponse.json({ error: 'Refund not found' }, { status: 404 })
        }

        // Update refund status
        const updatedRefund = await prisma.refund.update({
            where: { id: refundId },
            data: {
                status,
                ...(status === 'processed' && { processedAt: new Date() })
            }
        })

        return NextResponse.json({
            message: "Refund status updated successfully",
            refund: updatedRefund
        })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
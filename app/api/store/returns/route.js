import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Create return request
export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { orderId, reason, images } = await request.json()

        // Validate required fields
        if (!orderId || !reason) {
            return NextResponse.json({ error: 'Order ID and reason are required' }, { status: 400 })
        }

        // Check if order belongs to store
        const order = await prisma.order.findFirst({
            where: { id: orderId, storeId }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Create return request
        const returnRequest = await prisma.return.create({
            data: {
                orderId,
                reason,
                status: 'REQUESTED'
            }
        })

        return NextResponse.json({
            message: "Return request created successfully",
            return: returnRequest
        })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get returns for store orders
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

        const returns = await prisma.return.findMany({
            where,
            include: {
                order: {
                    include: {
                        user: true,
                        address: true,
                        orderItems: { include: { product: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ returns })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Update return status
export async function PUT(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { returnId, status, refundAmount } = await request.json()

        if (!returnId || !status) {
            return NextResponse.json({ error: 'Return ID and status are required' }, { status: 400 })
        }

        // Check if return belongs to store
        const returnRequest = await prisma.return.findFirst({
            where: { id: returnId, order: { storeId } },
            include: { order: true }
        })

        if (!returnRequest) {
            return NextResponse.json({ error: 'Return request not found' }, { status: 404 })
        }

        // Update return status
        const updatedReturn = await prisma.return.update({
            where: { id: returnId },
            data: {
                status,
                ...(status === 'APPROVED' && { approvedAt: new Date() }),
                ...(status === 'RECEIVED' && { receivedAt: new Date() }),
                ...(status === 'REFUNDED' && { refundedAt: new Date() })
            }
        })

        // If refunding, create refund record and process via Stripe
        if (status === 'REFUNDED' && refundAmount) {
            await prisma.refund.create({
                data: {
                    orderId: returnRequest.orderId,
                    amount: refundAmount,
                    reason: 'Return refund',
                    status: 'pending'
                }
            })

            // TODO: Integrate with Stripe for actual refund processing
        }

        return NextResponse.json({
            message: "Return status updated successfully",
            return: updatedReturn
        })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
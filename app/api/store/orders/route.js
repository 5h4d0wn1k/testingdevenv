import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { storeOrderUpdateSchema } from "@/lib/validations";
import { requirePermission, PERMISSIONS } from "@/lib/rbac";
import { rateLimit } from "@/lib/rateLimit";
import logger from "@/lib/logger";
import { decryptObject, SENSITIVE_FIELDS } from "@/lib/encryption";
import { inngest } from "@/inngest/client";


// Update seller order status
export async function POST(request){
    try {
        // Rate limiting: 50 requests per minute for order updates
        const rateLimitResponse = await rateLimit(request, 50, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const {orderId, status } = await request.json()

        const validation = storeOrderUpdateSchema.safeParse({orderId, status})
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const {orderId: validatedOrderId, status: validatedStatus} = validation.data

        // RBAC check
        const rbacResult = await requirePermission(PERMISSIONS.ORDER_UPDATE)(request, { orderId: validatedOrderId });
        if (rbacResult.error) {
            return NextResponse.json({ error: rbacResult.error }, { status: rbacResult.status })
        }

        // Get store ID for the update
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { store: true }
        });

        if (!user?.store) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const order = await prisma.order.findUnique({
            where: { id: validatedOrderId, storeId: user.store.id },
            include: { orderItems: true }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // If order is being cancelled, release reserved stock
        if (validatedStatus === 'CANCELLED' && order.status !== 'CANCELLED') {
            try {
                const releaseResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/store/inventory/reserve`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': request.headers.get('authorization')
                    },
                    body: JSON.stringify({
                        orderId: validatedOrderId,
                        items: order.orderItems.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity
                        }))
                    })
                })

                if (!releaseResponse.ok) {
                    const errorData = await releaseResponse.json()
                    logger.logError('Stock release failed', errorData, { orderId: validatedOrderId, storeId: user.store.id })
                } else {
                    const releaseData = await releaseResponse.json()
                    if (!releaseData.success) {
                        logger.logError('Partial stock release', releaseData.errors, { orderId: validatedOrderId, storeId: user.store.id })
                    }
                }
            } catch (error) {
                logger.logError('Stock release error', error, { orderId: validatedOrderId, storeId: user.store.id })
            }
        }

        await prisma.order.update({
            where: { id: validatedOrderId, storeId: user.store.id },
            data: {status: validatedStatus}
        })

        // Audit logging
        await prisma.auditLog.create({
            data: {
                userId,
                storeId: user.store.id,
                action: 'ORDER_STATUS_UPDATE',
                details: { orderId: validatedOrderId, newStatus: validatedStatus }
            }
        });

        logger.logBusinessEvent('Order Status Updated', { orderId: validatedOrderId, newStatus: validatedStatus, userId });

        return NextResponse.json({message: "Order Status updated"})
    } catch (error) {
        logger.logError('Order status update error', error, { userId });
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get all orders for a seller with filtering
export async function GET(request){
    try {
        // Rate limiting: 30 requests per minute for order reads
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        // RBAC check
        const rbacResult = await requirePermission(PERMISSIONS.ORDER_READ)(request);
        if (rbacResult.error) {
            return NextResponse.json({ error: rbacResult.error }, { status: rbacResult.status })
        }

        // Get store ID
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { store: true }
        });

        if (!user?.store) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const paymentMethod = searchParams.get('paymentMethod')
        const fulfillmentType = searchParams.get('fulfillmentType')

        const where = { storeId: user.store.id }

        if (status && status !== 'all') {
            where.status = status
        }

        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        }

        if (paymentMethod && paymentMethod !== 'all') {
            where.paymentMethod = paymentMethod
        }

        // Note: fulfillmentType would need additional logic based on shipping/carrier integration

        const orders = await prisma.order.findMany({
            where,
            include: {
                user: true,
                address: true,
                orderItems: {include: {product: true}},
                shipments: true,
                returns: true,
                refunds: true
            },
            orderBy: {createdAt: 'desc' }
        })

        // Add commission information to each order and decrypt addresses
        const ordersWithCommission = orders.map(order => ({
            ...order,
            address: order.address ? decryptObject(order.address, SENSITIVE_FIELDS.ADDRESS) : order.address,
            netEarnings: order.total, // This is already the amount after commission deduction
            commissionAmount: order.totalCommission,
            commissionPaid: order.commissionPaid
        }))

        // Audit logging for order access
        await prisma.auditLog.create({
            data: {
                userId,
                storeId: user.store.id,
                action: 'ORDERS_READ',
                details: { orderCount: orders.length, filters: { status, startDate, endDate, paymentMethod } }
            }
        });

        return NextResponse.json({orders: ordersWithCommission})
    } catch (error) {
        logger.logError('Order read error', error, { userId });
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
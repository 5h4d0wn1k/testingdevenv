import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import logger from "@/lib/logger";
import requestLogger from "@/lib/middleware/requestLogger";
import authAdmin from "@/middlewares/authAdmin";
import Stripe from "stripe";
import { OrderStatus } from "@prisma/client";

export const GET = requestLogger(authAdmin(async (request, { params }) => {
    try {
        // Rate limiting: 50 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 50, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { id } = params;

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                user: {
                    select: { name: true, email: true }
                },
                store: {
                    select: { name: true, username: true, email: true, contact: true }
                },
                address: true,
                orderItems: {
                    include: {
                        product: {
                            select: { name: true, images: true, description: true }
                        }
                    }
                }
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        return NextResponse.json(order);

    } catch (error) {
        logger.logError('Error retrieving admin order detail', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}));

export const PATCH = requestLogger(authAdmin(async (request, { params }) => {
    try {
        // Rate limiting: 30 requests per minute for admin actions
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { id } = params;
        const { status, refund } = await request.json();

        const order = await prisma.order.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (status) {
            // Update order status
            await prisma.order.update({
                where: { id },
                data: { status }
            });
            logger.logBusinessEvent('Order Status Updated by Admin', { orderId: id, newStatus: status });
            return NextResponse.json({ message: 'Order status updated successfully' });
        }

        if (refund) {
            // Process refund
            if (!order.isPaid || order.paymentMethod !== 'STRIPE') {
                return NextResponse.json({ error: 'Refund not available for this order' }, { status: 400 });
            }

            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

            // Find the payment intent or charge
            // This is simplified - in real implementation, you'd store payment intent ID
            const paymentIntents = await stripe.paymentIntents.list({
                limit: 100
            });

            const paymentIntent = paymentIntents.data.find(pi =>
                pi.metadata.orderIds && pi.metadata.orderIds.includes(id)
            );

            if (!paymentIntent) {
                return NextResponse.json({ error: 'Payment intent not found' }, { status: 404 });
            }

            // Create refund
            const refundAmount = Math.round(order.total * 100); // Convert to cents
            await stripe.refunds.create({
                payment_intent: paymentIntent.id,
                amount: refundAmount,
                reason: 'requested_by_customer'
            });

            // Update order status
            await prisma.order.update({
                where: { id },
                data: { status: OrderStatus.CANCELLED }
            });

            logger.logBusinessEvent('Order Refunded by Admin', { orderId: id, amount: order.total });
            return NextResponse.json({ message: 'Refund processed successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        logger.logError('Error updating admin order', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}));
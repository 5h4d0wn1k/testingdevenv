import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import logger from "@/lib/logger";
import requestLogger from "@/lib/middleware/requestLogger";
import authAdmin from "@/middlewares/authAdmin";

export const GET = requestLogger(authAdmin(async (request) => {
    try {
        // Rate limiting: 50 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 50, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;
        const status = searchParams.get('status');
        const paymentMethod = searchParams.get('paymentMethod');
        const dateRange = searchParams.get('dateRange'); // e.g., '7d', '30d', '90d'

        const skip = (page - 1) * limit;

        // Build where clause
        const where = {};
        if (status) {
            where.status = status;
        }
        if (paymentMethod) {
            where.paymentMethod = paymentMethod;
        }
        if (dateRange) {
            const days = parseInt(dateRange.replace('d', ''));
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            where.createdAt = {
                gte: startDate
            };
        }

        const [orders, totalCount] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    user: {
                        select: { name: true, email: true }
                    },
                    store: {
                        select: { name: true, username: true }
                    },
                    orderItems: {
                        include: {
                            product: {
                                select: { name: true, images: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.order.count({ where })
        ]);

        return NextResponse.json({
            orders,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error) {
        logger.logError('Error retrieving admin orders', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}));
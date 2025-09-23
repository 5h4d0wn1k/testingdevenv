import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { commissionRateSchema } from "@/lib/validations";

export async function GET(request, { params }) {
    try {
        // Rate limiting: 60 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 60, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { id } = params

        const store = await prisma.store.findUnique({
            where: { id },
            include: {
                user: true,
                CommissionRate: true,
                Order: {
                    select: {
                        status: true
                    }
                },
                Product: {
                    include: {
                        rating: {
                            select: {
                                rating: true
                            }
                        }
                    }
                }
            }
        })

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Calculate KPIs
        const totalOrders = store.Order.length
        const fulfilledOrders = store.Order.filter(order => order.status === 'DELIVERED').length
        const cancellationRate = totalOrders > 0 ? ((totalOrders - fulfilledOrders) / totalOrders * 100).toFixed(2) : 0

        // Average rating
        const ratings = store.Product.flatMap(product => product.rating.map(r => r.rating))
        const averageRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0

        const storeDetail = {
            ...store,
            kpis: {
                ordersFulfilled: fulfilledOrders,
                cancellationRate: parseFloat(cancellationRate),
                averageRating: parseFloat(averageRating)
            }
        }

        return NextResponse.json({ store: storeDetail })

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

export async function POST(request, { params }) {
    try {
        // Rate limiting: 60 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 60, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { id } = params

        const { rate } = await request.json()

        const validation = commissionRateSchema.safeParse({ rate })
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const { rate: validatedRate } = validation.data

        // Check if store exists
        const store = await prisma.store.findUnique({
            where: { id }
        })

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Upsert commission rate
        const commissionRate = await prisma.commissionRate.upsert({
            where: { storeId: id },
            update: {
                rate: validatedRate,
                adminUserId: userId
            },
            create: {
                storeId: id,
                rate: validatedRate,
                adminUserId: userId
            }
        })

        return NextResponse.json({ message: 'Commission rate updated successfully', commissionRate })

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
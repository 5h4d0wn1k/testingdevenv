import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

// Get all products with filters and pagination
export async function GET(request){
    try {
        // Rate limiting: 60 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 60, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page')) || 1
        const limit = parseInt(searchParams.get('limit')) || 10
        const search = searchParams.get('search')
        const vendor = searchParams.get('vendor') // storeId
        const category = searchParams.get('category')
        const status = searchParams.get('status')

        let where = {}

        if (search) {
            where.name = { contains: search, mode: 'insensitive' }
        }

        if (vendor) {
            where.storeId = vendor
        }

        if (category) {
            where.category = { contains: category, mode: 'insensitive' }
        }

        if (status) {
            where.status = status
        }

        const skip = (page - 1) * limit

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    store: {
                        select: {
                            id: true,
                            name: true,
                            username: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.product.count({ where })
        ])

        return NextResponse.json({
            products,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

// Get all stores with filters
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
        const status = searchParams.get('status')
        const category = searchParams.get('category')
        const rating = searchParams.get('rating')

        let where = {}

        if (status) {
            where.status = status
        }

        // For category and rating, need more complex queries, but for now basic
        // TODO: implement category and rating filters

        const stores = await prisma.store.findMany({
            where,
            include: {
                user: true,
                _count: {
                    select: { Order: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ stores })

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
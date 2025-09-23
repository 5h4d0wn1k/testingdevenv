import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { payoutStatusQuerySchema } from "@/lib/validations";

// GET /api/admin/payouts - Fetch all payouts, optionally filter by status
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status'); // e.g., 'PENDING', 'PAID', 'FAILED'
        const vendor = searchParams.get('vendor'); // search by store name or username
        const startDate = searchParams.get('startDate'); // payout period start
        const endDate = searchParams.get('endDate'); // payout period end

        const validation = payoutStatusQuerySchema.safeParse({status})
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const whereClause = validation.data.status ? { status: validation.data.status } : {};

        // Add vendor search
        if (vendor) {
            whereClause.store = {
                OR: [
                    { name: { contains: vendor, mode: 'insensitive' } },
                    { username: { contains: vendor, mode: 'insensitive' } }
                ]
            };
        }

        // Add date range filter (on createdAt or scheduledDate)
        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt.gte = new Date(startDate);
            if (endDate) whereClause.createdAt.lte = new Date(endDate);
        }

        const payouts = await prisma.payout.findMany({
            where: whereClause,
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ payouts });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
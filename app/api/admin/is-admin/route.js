import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";


// Get user role
export async function GET(request){
    try {
        // Rate limiting: 100 requests per minute for authentication endpoints
        const rateLimitResponse = await rateLimit(request, 100, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'user not found' }, { status: 404 })
        }

        return NextResponse.json({ role: user.role })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";


// Auth Seller
export async function GET(request) {
    try {
        // Rate limiting: 5 requests per minute for authentication endpoints
        const rateLimitResponse = await rateLimit(request, 5, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        const isSeller = await authSeller(userId)

        if(!isSeller){
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const storeInfo = await prisma.store.findUnique({where: {userId}})

        return NextResponse.json({isSeller, storeInfo})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
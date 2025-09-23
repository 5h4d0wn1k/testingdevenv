import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { couponVerifySchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";


// Verify coupon
export async function POST(request){
    try {
        // Rate limiting: 30 requests per minute for order/cart operations
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const {userId, has} = getAuth(request)
        const { code } = await request.json()

        const validation = couponVerifySchema.safeParse({code})
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const validatedCode = validation.data.code.toUpperCase()

        const coupon = await prisma.coupon.findUnique({
            where: {code: validatedCode,
                expiresAt: {gt: new Date()}
            }
        })

        if (!coupon){
            return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
        }

        if(coupon.forNewUser){
            const userorders = await prisma.order.findMany({where: {userId}})
            if(userorders.length > 0){
                return NextResponse.json({ error: "Coupon valid for new users" }, { status: 400 })
            }
        }

        if (coupon.forMember){
            const hasPlusPlan = has({plan: 'plus'})
            if(!hasPlusPlan){
                return NextResponse.json({ error: "Coupon valid for members only" }, { status: 400 })
            }
        }

        return NextResponse.json({coupon})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
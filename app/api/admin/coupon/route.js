import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { couponSchema, codeQuerySchema } from "@/lib/validations";


// Add new coupon
export async function POST(request){
    try {
        const { userId } = getAuth(request)
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 })
        }

        const { coupon } = await request.json()

        const validation = couponSchema.safeParse(coupon)
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const validatedCoupon = { ...validation.data, code: validation.data.code.toUpperCase() }

        await prisma.coupon.create({data: validatedCoupon}).then(async (coupon) => {
            // Run Inngest Sheduler Function to delete coupon on expire
            await inngest.send({
                name: "app/coupon.expired",
                data: {
                    code: coupon.code,
                    expires_at: coupon.expiresAt,
                }
            })
        })

        return NextResponse.json({message: "Coupon added successfully"})

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Delete coupon  /api/coupon?id=couponId
export async function DELETE(request){
    try {
        const { userId } = getAuth(request)
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 })
        }

        const { searchParams } = request.nextUrl;
        const code = searchParams.get('code')

        const validation = codeQuerySchema.safeParse({code})
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const { code: validatedCode } = validation.data

        await prisma.coupon.delete({where: { code: validatedCode }})
        return NextResponse.json({ message: 'Coupon deleted successfully' })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get all coupons
export async function GET(request){
    try {
        const { userId } = getAuth(request)
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 })
        }
        const coupons = await prisma.coupon.findMany({})
        return NextResponse.json({ coupons })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
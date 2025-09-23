import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

// Get product details
export async function GET(request, { params }){
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

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true
                    }
                }
            }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json({ product })

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Update product status and log moderation actions
export async function PATCH(request, { params }){
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
        const { action, reason } = await request.json()

        const product = await prisma.product.findUnique({ where: { id } })
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        let newStatus = product.status
        let logEntry = {
            action,
            reason: reason || '',
            adminId: userId,
            timestamp: new Date().toISOString()
        }

        if (action === 'activate') {
            newStatus = 'ACTIVE'
        } else if (action === 'deactivate') {
            newStatus = 'OUT_OF_STOCK' // or INACTIVE, but using OUT_OF_STOCK as per enum
        } else if (action === 'flag') {
            newStatus = 'FLAGGED'
        } else if (action === 'request_info') {
            // Maybe add a flag for requested info, but for now just log
        } else if (action === 'delete') {
            // Delete the product
            await prisma.product.delete({ where: { id } })
            return NextResponse.json({ message: 'Product deleted' })
        }

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: {
                status: newStatus,
                flagLogs: [...(product.flagLogs || []), logEntry]
            }
        })

        return NextResponse.json({ product: updatedProduct })

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from 'zod'

const statusSchema = z.object({
    status: z.enum(['ACTIVE', 'FLAGGED', 'OUT_OF_STOCK', 'DRAFT', 'ARCHIVED', 'DELETED'])
})

export async function PATCH(request, { params }) {
    try {
        const { userId } = getAuth(request)
        const { id } = params
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { status } = await request.json()
        const validation = statusSchema.safeParse({ status })

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        // Check if product exists and belongs to store
        const product = await prisma.product.findFirst({
            where: { id, storeId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        await prisma.product.update({
            where: { id },
            data: { status }
        })

        // Log the status change
        await prisma.auditLog.create({
            data: {
                storeId,
                userId,
                action: 'product_status_change',
                details: { productId: id, oldStatus: product.status, newStatus: status }
            }
        })

        return NextResponse.json({ message: 'Product status updated successfully' })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}
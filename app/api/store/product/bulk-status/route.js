import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from 'zod'

const bulkStatusSchema = z.object({
    productIds: z.array(z.string().min(1)).min(1, 'At least one product ID required'),
    status: z.enum(['ACTIVE', 'FLAGGED', 'OUT_OF_STOCK', 'DRAFT', 'ARCHIVED', 'DELETED'])
})

export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { productIds, status } = await request.json()
        const validation = bulkStatusSchema.safeParse({ productIds, status })

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error.errors }, { status: 400 })
        }

        // Verify all products belong to the store
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                storeId
            }
        })

        if (products.length !== productIds.length) {
            return NextResponse.json({ error: 'Some products not found or not authorized' }, { status: 404 })
        }

        // Bulk update status
        await prisma.product.updateMany({
            where: {
                id: { in: productIds },
                storeId
            },
            data: { status }
        })

        // Log the bulk status change
        await prisma.auditLog.create({
            data: {
                storeId,
                userId,
                action: 'bulk_product_status_change',
                details: { productIds, newStatus: status, count: productIds.length }
            }
        })

        return NextResponse.json({
            message: `Successfully updated ${productIds.length} products to ${status} status`
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}
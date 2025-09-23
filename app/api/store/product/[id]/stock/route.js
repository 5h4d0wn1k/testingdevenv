import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from 'zod'

const stockSchema = z.object({
    stock: z.number().min(0, 'Stock must be non-negative')
})

export async function PATCH(request, { params }) {
    try {
        const { userId } = getAuth(request)
        const { id } = params
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { stock } = await request.json()
        const validation = stockSchema.safeParse({ stock })

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid stock value' }, { status: 400 })
        }

        // Check if product exists and belongs to store
        const product = await prisma.product.findFirst({
            where: { id, storeId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const oldStock = product.stock || 0
        const stockChange = stock - oldStock

        await prisma.$transaction(async (tx) => {
            // Update product stock
            await tx.product.update({
                where: { id },
                data: {
                    stock,
                    inStock: stock > 0,
                    status: stock === 0 ? 'OUT_OF_STOCK' : product.status === 'OUT_OF_STOCK' ? 'ACTIVE' : product.status
                }
            })

            // Create inventory log
            await tx.inventoryLog.create({
                data: {
                    productId: id,
                    changeType: stockChange > 0 ? 'stock_increase' : 'stock_decrease',
                    quantity: Math.abs(stockChange),
                    reason: 'Manual stock update'
                }
            })
        })

        // Log the stock change
        await prisma.auditLog.create({
            data: {
                storeId,
                userId,
                action: 'product_stock_change',
                details: { productId: id, oldStock, newStock: stock, change: stockChange }
            }
        })

        return NextResponse.json({ message: 'Product stock updated successfully' })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}
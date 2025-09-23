import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from 'zod'

const bulkStockSchema = z.object({
    productIds: z.array(z.string().min(1)).min(1, 'At least one product ID required'),
    stockChange: z.number().int('Stock change must be an integer')
})

export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { productIds, stockChange } = await request.json()
        const validation = bulkStockSchema.safeParse({ productIds, stockChange })

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

        // Bulk update stock
        await prisma.$transaction(async (tx) => {
            // Update products
            for (const product of products) {
                const newStock = Math.max(0, (product.stock || 0) + stockChange)
                await tx.product.update({
                    where: { id: product.id },
                    data: {
                        stock: newStock,
                        inStock: newStock > 0,
                        status: newStock === 0 ? 'OUT_OF_STOCK' : product.status === 'OUT_OF_STOCK' ? 'ACTIVE' : product.status
                    }
                })

                // Create inventory log
                await tx.inventoryLog.create({
                    data: {
                        productId: product.id,
                        changeType: stockChange > 0 ? 'bulk_stock_increase' : 'bulk_stock_decrease',
                        quantity: Math.abs(stockChange),
                        reason: 'Bulk stock adjustment'
                    }
                })
            }
        })

        // Log the bulk stock change
        await prisma.auditLog.create({
            data: {
                storeId,
                userId,
                action: 'bulk_product_stock_change',
                details: { productIds, stockChange, count: productIds.length }
            }
        })

        return NextResponse.json({
            message: `Successfully adjusted stock by ${stockChange} for ${productIds.length} products`
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}
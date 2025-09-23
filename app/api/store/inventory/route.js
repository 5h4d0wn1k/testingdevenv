import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Get inventory summary and low stock alerts
export async function GET(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const alertOnly = searchParams.get('alerts') === 'true'
        const lowStockThreshold = parseInt(searchParams.get('threshold')) || 5

        let whereCondition = { storeId }

        if (alertOnly) {
            whereCondition.stock = { lte: lowStockThreshold, gt: 0 }
        }

        const products = await prisma.product.findMany({
            where: whereCondition,
            select: {
                id: true,
                name: true,
                sku: true,
                stock: true,
                reservedStock: true,
                lowStockThreshold: true,
                inStock: true,
                status: true,
                category: true,
                images: true,
                mediaGallery: {
                    where: { isPrimary: true },
                    take: 1
                },
                inventoryLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            },
            orderBy: { stock: 'asc' }
        })

        const summary = {
            totalProducts: products.length,
            inStock: products.filter(p => p.inStock && (p.stock - p.reservedStock) > 0).length,
            outOfStock: products.filter(p => !p.inStock || (p.stock - p.reservedStock) <= 0).length,
            lowStock: products.filter(p => {
                const availableStock = p.stock - p.reservedStock
                return availableStock <= (p.lowStockThreshold || lowStockThreshold) && availableStock > 0
            }).length,
            reservedStock: products.reduce((sum, p) => sum + p.reservedStock, 0)
        }

        return NextResponse.json({
            summary,
            products: products.map(product => {
                const availableStock = product.stock - product.reservedStock
                const threshold = product.lowStockThreshold || lowStockThreshold
                return {
                    ...product,
                    availableStock,
                    stockStatus: !product.inStock || availableStock <= 0 ? 'out_of_stock' :
                                availableStock <= threshold ? 'low_stock' : 'in_stock'
                }
            })
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}
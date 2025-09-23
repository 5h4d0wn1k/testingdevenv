import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const updatePriceSchema = z.object({
    price: z.number().min(0, 'Price must be positive'),
    reason: z.string().optional(),
    effectiveDate: z.string().datetime().optional(),
})

const schedulePriceChangeSchema = z.object({
    price: z.number().min(0, 'Price must be positive'),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    reason: z.string().optional(),
})

// GET /api/store/product/[id]/pricing - Get pricing history and scheduled changes
export async function GET(request, { params }) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const productId = params.id

        // Verify product belongs to store
        const product = await prisma.product.findFirst({
            where: { id: productId, storeId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const priceHistory = await prisma.productPriceHistory.findMany({
            where: { productId },
            orderBy: { createdAt: 'desc' },
            take: 20
        })

        const scheduledChanges = product.scheduledPriceChanges || []

        return NextResponse.json({
            currentPrice: product.price,
            basePrice: product.basePrice,
            priceHistory,
            scheduledChanges
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST /api/store/product/[id]/pricing - Update product price
export async function POST(request, { params }) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const productId = params.id
        const body = await request.json()
        const validation = updatePriceSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validation.error.errors
            }, { status: 400 })
        }

        const { price, reason, effectiveDate } = validation.data

        // Verify product belongs to store
        const product = await prisma.product.findFirst({
            where: { id: productId, storeId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // Record price change in history
        await prisma.productPriceHistory.create({
            data: {
                productId,
                oldPrice: product.price,
                newPrice: price,
                changeType: 'manual',
                reason: reason || 'Manual price update',
                changedBy: userId,
                effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date()
            }
        })

        // Update product price
        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                price,
                basePrice: price, // Update base price as well
                updatedAt: new Date()
            }
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId,
                storeId,
                action: 'PRODUCT_PRICE_UPDATE',
                details: {
                    productId,
                    oldPrice: product.price,
                    newPrice: price,
                    reason
                }
            }
        })

        return NextResponse.json({
            message: 'Price updated successfully',
            product: updatedProduct
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PUT /api/store/product/[id]/pricing/schedule - Schedule price changes
export async function PUT(request, { params }) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const productId = params.id
        const body = await request.json()
        const { action, ...changeData } = body

        // Verify product belongs to store
        const product = await prisma.product.findFirst({
            where: { id: productId, storeId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        if (action === 'add') {
            const validation = schedulePriceChangeSchema.safeParse(changeData)

            if (!validation.success) {
                return NextResponse.json({
                    error: 'Validation failed',
                    details: validation.error.errors
                }, { status: 400 })
            }

            const { price, startDate, endDate, reason } = validation.data

            const currentScheduled = product.scheduledPriceChanges || []
            const newChange = {
                id: Date.now().toString(),
                price,
                startDate,
                endDate,
                reason: reason || 'Scheduled price change'
            }

            const updatedProduct = await prisma.product.update({
                where: { id: productId },
                data: {
                    scheduledPriceChanges: [...currentScheduled, newChange]
                }
            })

            return NextResponse.json({
                message: 'Price change scheduled successfully',
                scheduledChange: newChange,
                product: updatedProduct
            })

        } else if (action === 'remove') {
            const { changeId } = changeData
            const currentScheduled = product.scheduledPriceChanges || []
            const updatedScheduled = currentScheduled.filter(change => change.id !== changeId)

            const updatedProduct = await prisma.product.update({
                where: { id: productId },
                data: {
                    scheduledPriceChanges: updatedScheduled
                }
            })

            return NextResponse.json({
                message: 'Scheduled price change removed',
                product: updatedProduct
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const createPromotionSchema = z.object({
    type: z.enum(['NONE', 'PERCENTAGE', 'FIXED', 'BUY_X_GET_Y', 'BUNDLE', 'QUANTITY_DISCOUNT', 'FLASH_DEAL']),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    priority: z.number().min(0).optional(),
    conditions: z.record(z.any()).optional(),
    actions: z.record(z.any()).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    usageLimit: z.number().min(0).optional(),
    perUserLimit: z.number().min(0).optional(),
})

// GET /api/store/product/[id]/promotions - Get product promotions
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

        const promotions = await prisma.productPromotionRule.findMany({
            where: { productId },
            orderBy: { priority: 'desc' }
        })

        return NextResponse.json({ promotions })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST /api/store/product/[id]/promotions - Create promotion rule
export async function POST(request, { params }) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const productId = params.id
        const body = await request.json()
        const validation = createPromotionSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validation.error.errors
            }, { status: 400 })
        }

        // Verify product belongs to store
        const product = await prisma.product.findFirst({
            where: { id: productId, storeId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const promotionData = {
            ...validation.data,
            productId,
            isActive: true,
            priority: validation.data.priority || 0,
            usageCount: 0
        }

        const promotion = await prisma.productPromotionRule.create({
            data: promotionData
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId,
                storeId,
                action: 'PROMOTION_CREATED',
                details: {
                    productId,
                    promotionId: promotion.id,
                    type: promotion.type,
                    name: promotion.name
                }
            }
        })

        return NextResponse.json({
            message: 'Promotion created successfully',
            promotion
        }, { status: 201 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PUT /api/store/product/[id]/promotions/[promotionId] - Update promotion
export async function PUT(request, { params }) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const productId = params.id
        const url = new URL(request.url)
        const promotionId = url.pathname.split('/').pop()

        const body = await request.json()
        const validation = createPromotionSchema.partial().safeParse(body)

        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validation.error.errors
            }, { status: 400 })
        }

        // Verify product belongs to store
        const product = await prisma.product.findFirst({
            where: { id: productId, storeId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const promotion = await prisma.productPromotionRule.update({
            where: {
                id: promotionId,
                productId // Extra security check
            },
            data: validation.data
        })

        return NextResponse.json({
            message: 'Promotion updated successfully',
            promotion
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE /api/store/product/[id]/promotions/[promotionId] - Delete promotion
export async function DELETE(request, { params }) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const productId = params.id
        const url = new URL(request.url)
        const promotionId = url.pathname.split('/').pop()

        // Verify product belongs to store
        const product = await prisma.product.findFirst({
            where: { id: productId, storeId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        await prisma.productPromotionRule.delete({
            where: {
                id: promotionId,
                productId // Extra security check
            }
        })

        return NextResponse.json({ message: 'Promotion deleted successfully' })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
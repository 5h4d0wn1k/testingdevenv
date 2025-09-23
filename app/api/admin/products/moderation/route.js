import prisma from "@/lib/prisma"
import authAdmin from "@/middlewares/authAdmin"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// GET /api/admin/products/moderation - Get products pending moderation
export async function GET(request) {
    try {
        const { userId } = getAuth(request)
        const adminId = await authAdmin(userId)

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'PENDING'
        const page = parseInt(searchParams.get('page')) || 1
        const limit = parseInt(searchParams.get('limit')) || 20

        const where = {
            moderationStatus: status
        }

        if (searchParams.get('storeId')) {
            where.storeId = searchParams.get('storeId')
        }

        const products = await prisma.product.findMany({
            where,
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        vendorStatus: true
                    }
                },
                moderationLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                mediaGallery: {
                    where: { isPrimary: true },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit
        })

        const total = await prisma.product.count({ where })

        return NextResponse.json({
            products,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST /api/admin/products/moderation - Moderate products
export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const adminId = await authAdmin(userId)

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { productIds, action, reason, notes } = body

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json({ error: 'Product IDs are required' }, { status: 400 })
        }

        if (!['approve', 'reject', 'require_changes'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        const results = []
        const errors = []

        for (const productId of productIds) {
            try {
                // Get current product state
                const product = await prisma.product.findUnique({
                    where: { id: productId },
                    include: { store: true }
                })

                if (!product) {
                    errors.push(`Product ${productId} not found`)
                    continue
                }

                let newStatus
                let actionType

                switch (action) {
                    case 'approve':
                        newStatus = 'APPROVED'
                        actionType = 'approved'
                        // If approved, also set product status to ACTIVE
                        await prisma.product.update({
                            where: { id: productId },
                            data: {
                                moderationStatus: newStatus,
                                status: 'ACTIVE'
                            }
                        })
                        break
                    case 'reject':
                        newStatus = 'REJECTED'
                        actionType = 'rejected'
                        // If rejected, set product status to ARCHIVED
                        await prisma.product.update({
                            where: { id: productId },
                            data: {
                                moderationStatus: newStatus,
                                status: 'ARCHIVED'
                            }
                        })
                        break
                    case 'require_changes':
                        newStatus = 'REQUIRES_CHANGES'
                        actionType = 'requires_changes'
                        break
                }

                // Create moderation log
                await prisma.productModerationLog.create({
                    data: {
                        productId,
                        action: actionType,
                        reason,
                        notes,
                        moderatedBy: userId,
                        previousStatus: product.moderationStatus,
                        newStatus,
                        productSnapshot: JSON.stringify({
                            name: product.name,
                            description: product.description,
                            price: product.price,
                            category: product.category,
                            images: product.images,
                            status: product.status
                        })
                    }
                })

                // Audit log
                await prisma.auditLog.create({
                    data: {
                        userId,
                        storeId: product.storeId,
                        action: 'PRODUCT_MODERATION',
                        details: {
                            productId,
                            action: actionType,
                            reason,
                            previousStatus: product.moderationStatus,
                            newStatus
                        }
                    }
                })

                results.push({
                    productId,
                    action: actionType,
                    newStatus,
                    success: true
                })

            } catch (error) {
                console.error(`Error moderating product ${productId}:`, error)
                errors.push(`Failed to moderate product ${productId}: ${error.message}`)
            }
        }

        return NextResponse.json({
            message: 'Moderation completed',
            results,
            errors,
            success: errors.length === 0
        })

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
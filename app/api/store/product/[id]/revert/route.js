import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// POST /api/store/product/[id]/revert - Revert product to previous version
export async function POST(request, { params }) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const productId = params.id
        const body = await request.json()
        const { moderationLogId, reason } = body

        // Verify product belongs to store
        const product = await prisma.product.findFirst({
            where: { id: productId, storeId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        if (!moderationLogId) {
            return NextResponse.json({ error: 'Moderation log ID is required' }, { status: 400 })
        }

        // Get the moderation log with snapshot
        const moderationLog = await prisma.productModerationLog.findFirst({
            where: {
                id: moderationLogId,
                productId
            }
        })

        if (!moderationLog || !moderationLog.productSnapshot) {
            return NextResponse.json({ error: 'Moderation log not found or has no snapshot' }, { status: 404 })
        }

        // Parse the snapshot
        const snapshot = JSON.parse(moderationLog.productSnapshot)

        // Update product with snapshot data
        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                name: snapshot.name,
                description: snapshot.description,
                price: snapshot.price,
                category: snapshot.category,
                images: snapshot.images,
                status: snapshot.status,
                moderationStatus: 'PENDING', // Reset to pending after revert
                updatedAt: new Date()
            }
        })

        // Create a new moderation log for the revert
        await prisma.productModerationLog.create({
            data: {
                productId,
                action: 'reverted',
                reason: reason || 'Reverted to previous version',
                notes: `Reverted from moderation log ${moderationLogId}`,
                moderatedBy: userId,
                previousStatus: product.moderationStatus,
                newStatus: 'PENDING',
                productSnapshot: JSON.stringify(snapshot)
            }
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId,
                storeId,
                action: 'PRODUCT_REVERT',
                details: {
                    productId,
                    revertedFromLogId: moderationLogId,
                    reason
                }
            }
        })

        return NextResponse.json({
            message: 'Product reverted successfully',
            product: updatedProduct
        })

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
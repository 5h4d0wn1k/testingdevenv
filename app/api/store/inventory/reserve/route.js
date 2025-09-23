import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// POST /api/store/inventory/reserve - Reserve stock for an order
export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { orderId, items } = body

        if (!orderId || !items || !Array.isArray(items)) {
            return NextResponse.json({
                error: 'Order ID and items array are required'
            }, { status: 400 })
        }

        // Validate order belongs to store
        const order = await prisma.order.findFirst({
            where: { id: orderId, storeId }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        const results = []
        const errors = []

        for (const item of items) {
            try {
                const { productId, variantId, quantity } = item

                // Check if product/variant exists and belongs to store
                let product
                if (variantId) {
                    const variant = await prisma.productVariant.findFirst({
                        where: { id: variantId },
                        include: { product: true }
                    })
                    if (!variant || variant.product.storeId !== storeId) {
                        errors.push(`Variant ${variantId} not found`)
                        continue
                    }
                    product = variant.product
                } else {
                    product = await prisma.product.findFirst({
                        where: { id: productId, storeId }
                    })
                    if (!product) {
                        errors.push(`Product ${productId} not found`)
                        continue
                    }
                }

                // Check available stock
                const availableStock = variantId ?
                    product.productVariants.find(v => v.id === variantId)?.stock || 0 :
                    product.stock

                const reservedStock = variantId ?
                    product.productVariants.find(v => v.id === variantId)?.reservedStock || 0 :
                    product.reservedStock

                const actualAvailable = availableStock - reservedStock

                if (actualAvailable < quantity) {
                    errors.push(`Insufficient stock for ${product.name}. Available: ${actualAvailable}, Requested: ${quantity}`)
                    continue
                }

                // Reserve stock
                if (variantId) {
                    await prisma.productVariant.update({
                        where: { id: variantId },
                        data: {
                            reservedStock: { increment: quantity }
                        }
                    })
                } else {
                    await prisma.product.update({
                        where: { id: productId },
                        data: {
                            reservedStock: { increment: quantity }
                        }
                    })
                }

                // Log the reservation
                await prisma.inventoryLog.create({
                    data: {
                        productId: variantId ? undefined : productId,
                        variantId: variantId || undefined,
                        changeType: 'reserved',
                        quantity: -quantity, // Negative because we're reducing available stock
                        reservedChange: quantity,
                        reason: `Reserved for order ${orderId}`,
                        orderId
                    }
                })

                results.push({
                    productId,
                    variantId,
                    quantity,
                    success: true
                })

            } catch (error) {
                console.error(`Error reserving stock for item:`, error)
                errors.push(`Failed to reserve stock: ${error.message}`)
            }
        }

        return NextResponse.json({
            message: 'Stock reservation completed',
            results,
            errors,
            success: errors.length === 0
        })

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST /api/store/inventory/release - Release reserved stock
export async function PUT(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { orderId, items } = body

        if (!orderId || !items || !Array.isArray(items)) {
            return NextResponse.json({
                error: 'Order ID and items array are required'
            }, { status: 400 })
        }

        // Validate order belongs to store
        const order = await prisma.order.findFirst({
            where: { id: orderId, storeId }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        const results = []
        const errors = []

        for (const item of items) {
            try {
                const { productId, variantId, quantity } = item

                // Check if product/variant exists and belongs to store
                let product
                if (variantId) {
                    const variant = await prisma.productVariant.findFirst({
                        where: { id: variantId },
                        include: { product: true }
                    })
                    if (!variant || variant.product.storeId !== storeId) {
                        errors.push(`Variant ${variantId} not found`)
                        continue
                    }
                    product = variant.product
                } else {
                    product = await prisma.product.findFirst({
                        where: { id: productId, storeId }
                    })
                    if (!product) {
                        errors.push(`Product ${productId} not found`)
                        continue
                    }
                }

                // Check current reserved stock
                const currentReserved = variantId ?
                    product.productVariants.find(v => v.id === variantId)?.reservedStock || 0 :
                    product.reservedStock

                const releaseQuantity = Math.min(quantity, currentReserved)

                if (releaseQuantity === 0) {
                    errors.push(`No reserved stock to release for ${product.name}`)
                    continue
                }

                // Release stock
                if (variantId) {
                    await prisma.productVariant.update({
                        where: { id: variantId },
                        data: {
                            reservedStock: { decrement: releaseQuantity }
                        }
                    })
                } else {
                    await prisma.product.update({
                        where: { id: productId },
                        data: {
                            reservedStock: { decrement: releaseQuantity }
                        }
                    })
                }

                // Log the release
                await prisma.inventoryLog.create({
                    data: {
                        productId: variantId ? undefined : productId,
                        variantId: variantId || undefined,
                        changeType: 'released',
                        quantity: releaseQuantity, // Positive because we're increasing available stock
                        reservedChange: -releaseQuantity,
                        reason: `Released from order ${orderId}`,
                        orderId
                    }
                })

                results.push({
                    productId,
                    variantId,
                    quantity: releaseQuantity,
                    success: true
                })

            } catch (error) {
                console.error(`Error releasing stock for item:`, error)
                errors.push(`Failed to release stock: ${error.message}`)
            }
        }

        return NextResponse.json({
            message: 'Stock release completed',
            results,
            errors,
            success: errors.length === 0
        })

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
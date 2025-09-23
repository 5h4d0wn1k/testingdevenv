import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// GET /api/store/product/[id]/media - Get product media
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

        const media = await prisma.productMedia.findMany({
            where: { productId },
            orderBy: { sortOrder: 'asc' }
        })

        return NextResponse.json({ media })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST /api/store/product/[id]/media - Add media to product
export async function POST(request, { params }) {
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

        const formData = await request.formData()
        const files = formData.getAll('files')

        if (files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 })
        }

        // Use the media upload API
        const mediaUploadFormData = new FormData()
        files.forEach(file => mediaUploadFormData.append('files', file))
        mediaUploadFormData.append('productId', productId)

        const mediaResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/store/media-upload`, {
            method: 'POST',
            headers: {
                Authorization: request.headers.get('authorization')
            },
            body: mediaUploadFormData
        })

        if (!mediaResponse.ok) {
            const errorData = await mediaResponse.json()
            return NextResponse.json({ error: errorData.error || 'Media upload failed' }, { status: 400 })
        }

        const mediaData = await mediaResponse.json()

        return NextResponse.json({
            message: 'Media added successfully',
            media: mediaData.media
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PATCH /api/store/product/[id]/media - Update media (sort order, primary, etc.)
export async function PATCH(request, { params }) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const productId = params.id
        const body = await request.json()
        const { mediaUpdates } = body

        // Verify product belongs to store
        const product = await prisma.product.findFirst({
            where: { id: productId, storeId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // Update media records
        for (const update of mediaUpdates) {
            await prisma.productMedia.update({
                where: {
                    id: update.id,
                    productId // Extra security check
                },
                data: {
                    sortOrder: update.sortOrder,
                    isPrimary: update.isPrimary,
                    alt: update.alt,
                    caption: update.caption
                }
            })
        }

        return NextResponse.json({ message: 'Media updated successfully' })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE /api/store/product/[id]/media/[mediaId] - Delete media
export async function DELETE(request, { params }) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const productId = params.id
        const url = new URL(request.url)
        const mediaId = url.pathname.split('/').pop()

        // Verify product belongs to store
        const product = await prisma.product.findFirst({
            where: { id: productId, storeId }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // Delete media record
        await prisma.productMedia.delete({
            where: {
                id: mediaId,
                productId // Extra security check
            }
        })

        return NextResponse.json({ message: 'Media deleted successfully' })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
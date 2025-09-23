import imagekit from "@/configs/imageKit"
import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { fileTypeFromBuffer } from 'file-type'
import path from 'path'
import { rateLimit } from "@/lib/rateLimit"
import sharp from 'sharp'

export async function POST(request) {
    try {
        // Rate limiting: 20 uploads per minute
        const rateLimitResponse = await rateLimit(request, 20, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const files = formData.getAll('files')
        const productId = formData.get('productId')
        const isPrimary = formData.get('isPrimary') === 'true'

        if (files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 })
        }

        if (files.length > 10) {
            return NextResponse.json({ error: 'Maximum 10 files allowed' }, { status: 400 })
        }

        // Validate product exists and belongs to store
        if (productId) {
            const product = await prisma.product.findFirst({
                where: { id: productId, storeId }
            })
            if (!product) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 })
            }
        }

        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
        const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg']
        const allowedDocumentTypes = ['application/pdf']
        const maxFileSize = 10 * 1024 * 1024 // 10MB

        const uploadedMedia = []

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer())
            const fileSize = buffer.length

            if (fileSize > maxFileSize) {
                return NextResponse.json({
                    error: `File ${file.name} exceeds maximum size of 10MB`
                }, { status: 400 })
            }

            const fileType = await fileTypeFromBuffer(buffer)
            if (!fileType) {
                return NextResponse.json({
                    error: `Could not determine file type for ${file.name}`
                }, { status: 400 })
            }

            const isImage = allowedImageTypes.includes(fileType.mime)
            const isVideo = allowedVideoTypes.includes(fileType.mime)
            const isDocument = allowedDocumentTypes.includes(fileType.mime)

            if (!isImage && !isVideo && !isDocument) {
                return NextResponse.json({
                    error: `File type ${fileType.mime} not allowed for ${file.name}`
                }, { status: 400 })
            }

            let uploadResults = []

            if (isImage) {
                // Process image with multiple sizes and watermark
                uploadResults = await processImage(buffer, file.name, storeId)
            } else {
                // Upload video or document as-is
                const result = await imagekit.upload({
                    file: buffer,
                    fileName: `${file.name}_${Date.now()}`,
                    folder: `stores/${storeId}/products`
                })
                uploadResults = [{
                    url: result.url,
                    type: isVideo ? 'VIDEO' : 'DOCUMENT',
                    size: 'original'
                }]
            }

            // Create ProductMedia records
            for (const uploadResult of uploadResults) {
                const mediaData = {
                    productId: productId || null,
                    url: uploadResult.url,
                    thumbnailUrl: uploadResult.thumbnailUrl,
                    type: uploadResult.type,
                    alt: file.name,
                    sortOrder: uploadedMedia.length,
                    isPrimary: isPrimary && uploadedMedia.length === 0,
                    fileSize,
                    dimensions: uploadResult.dimensions,
                    metadata: {
                        originalName: file.name,
                        mimeType: fileType.mime,
                        size: uploadResult.size
                    }
                }

                const media = await prisma.productMedia.create({
                    data: mediaData
                })

                uploadedMedia.push(media)
            }
        }

        return NextResponse.json({
            message: 'Media uploaded successfully',
            media: uploadedMedia
        })

    } catch (error) {
        console.error('Media upload error:', error)
        return NextResponse.json({
            error: error.code || error.message
        }, { status: 500 })
    }
}

async function processImage(buffer, fileName, storeId) {
    const results = []
    const baseName = path.parse(fileName).name
    const timestamp = Date.now()

    // Generate watermark overlay
    const watermarkSvg = `
        <svg width="200" height="50" xmlns="http://www.w3.org/2000/svg">
            <text x="10" y="30" font-family="Arial" font-size="12" fill="rgba(255,255,255,0.7)" font-weight="bold">
                ${process.env.WATERMARK_TEXT || 'Sample Store'}
            </text>
        </svg>`

    const watermarkBuffer = Buffer.from(watermarkSvg)

    // Process different sizes
    const sizes = [
        { name: 'thumbnail', width: 150, height: 150, fit: 'cover' },
        { name: 'medium', width: 500, height: 500, fit: 'inside' },
        { name: 'large', width: 1024, height: 1024, fit: 'inside' }
    ]

    for (const size of sizes) {
        let processedBuffer = buffer

        // Resize image
        processedBuffer = await sharp(buffer)
            .resize(size.width, size.height, {
                fit: size.fit,
                withoutEnlargement: true
            })
            .jpeg({ quality: 85 })
            .toBuffer()

        // Add watermark to medium and large sizes
        if (size.name !== 'thumbnail') {
            processedBuffer = await sharp(processedBuffer)
                .composite([{
                    input: watermarkBuffer,
                    top: 10,
                    left: 10,
                    blend: 'over'
                }])
                .jpeg({ quality: 85 })
                .toBuffer()
        }

        // Upload to ImageKit
        const result = await imagekit.upload({
            file: processedBuffer,
            fileName: `${baseName}_${size.name}_${timestamp}.jpg`,
            folder: `stores/${storeId}/products`
        })

        // Get dimensions
        const metadata = await sharp(processedBuffer).metadata()

        results.push({
            url: result.url,
            thumbnailUrl: size.name === 'thumbnail' ? result.url : null,
            type: 'IMAGE',
            size: size.name,
            dimensions: {
                width: metadata.width,
                height: metadata.height
            }
        })
    }

    return results
}
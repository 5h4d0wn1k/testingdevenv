import imagekit from "@/configs/imageKit"
import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import {getAuth} from "@clerk/nextjs/server"
import { NextResponse } from "next/server";
import { productSchema } from "@/lib/validations";
import { ModerationEngine } from "@/lib/moderationEngine";

// Add a new product
export async function POST(request){
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if(!storeId){
            return NextResponse.json({error: 'not authorized'}, { status: 401 } )
        }
        // Get the data from the form
        const formData = await request.formData()
        const name = formData.get("name")
        const description = formData.get("description")
        const mrp =  Number(formData.get("mrp"))
        const price = Number(formData.get("price"))
        const category = formData.get("category")
        const sku = formData.get("sku") || null
        const stock = Number(formData.get("stock")) || 0
        const hasVariants = formData.get("hasVariants") === "true"
        const promotionType = formData.get("promotionType") || "none"
        const promotionValue = Number(formData.get("promotionValue")) || 0
        const promotionStart = formData.get("promotionStart") || null
        const promotionEnd = formData.get("promotionEnd") || null
        const images = formData.getAll("images")
        const variants = hasVariants ? JSON.parse(formData.get("variants") || "[]") : []
        const attributes = JSON.parse(formData.get("attributes") || "{}")
        const subcategory = formData.get("subcategory") || null
        const tags = JSON.parse(formData.get("tags") || "[]")
        const costPrice = Number(formData.get("costPrice")) || null
        const weight = Number(formData.get("weight")) || null
        const dimensions = formData.get("dimensions") ? JSON.parse(formData.get("dimensions")) : null
        const seoTitle = formData.get("seoTitle") || null
        const seoDescription = formData.get("seoDescription") || null
        const seoKeywords = JSON.parse(formData.get("seoKeywords") || "[]")
        const isDigital = formData.get("isDigital") === "true"
        const digitalFileUrl = formData.get("digitalFileUrl") || null
        const lowStockThreshold = Number(formData.get("lowStockThreshold")) || 5

        const validation = productSchema.safeParse({name, description, mrp, price, category})
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        if (images.length < 1) {
            return NextResponse.json({error: 'At least one image is required'}, { status: 400 } )
        }

        const { name: validatedName, description: validatedDescription, mrp: validatedMrp, price: validatedPrice, category: validatedCategory } = validation.data

        // Upload images using enhanced media upload
        const mediaUploadFormData = new FormData()
        images.forEach(image => mediaUploadFormData.append('files', image))

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
        const imagesUrl = mediaData.media.map(m => m.url)

        const productData = {
            name: validatedName,
            description: validatedDescription,
            mrp: validatedMrp,
            price: validatedPrice,
            basePrice: validatedPrice,
            category: validatedCategory,
            subcategory,
            tags,
            attributes,
            images: imagesUrl,
            storeId,
            sku: sku,
            stock: stock,
            inStock: stock > 0,
            lowStockThreshold,
            costPrice,
            weight,
            dimensions,
            seoTitle,
            seoDescription,
            seoKeywords,
            isDigital,
            digitalFileUrl,
            productVariants: hasVariants ? {
                create: variants.map(variant => ({
                    name: variant.name,
                    sku: variant.sku,
                    price: variant.price || validatedPrice,
                    stock: variant.stock,
                    attributes: variant.attributes || {}
                }))
            } : undefined,
            attributeValues: {
                create: Object.entries(attributes).map(([templateId, value]) => ({
                    templateId,
                    value: JSON.stringify(value)
                }))
            }
        }

        // Add promotion data if applicable
        if (promotionType !== 'none' && promotionValue > 0) {
            productData.promotionType = promotionType
            productData.promotionValue = promotionValue
            if (promotionStart) productData.promotionStart = new Date(promotionStart)
            if (promotionEnd) productData.promotionEnd = new Date(promotionEnd)
        }

        const product = await prisma.product.create({
            data: productData
        })

        // Update media records with product ID
        if (mediaData.media && mediaData.media.length > 0) {
            await prisma.productMedia.updateMany({
                where: { id: { in: mediaData.media.map(m => m.id) } },
                data: { productId: product.id }
            })
        }

        // Evaluate auto-approval
        try {
            const store = await prisma.store.findUnique({
                where: { id: storeId },
                include: {
                    vendorFinancials: true,
                    supportTickets: {
                        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }
                    }
                }
            })

            const moderationDecision = ModerationEngine.evaluateAutoApproval(product, store)

            if (moderationDecision.autoApprove) {
                // Auto-approve the product
                await ModerationEngine.applyModerationDecision(
                    product.id,
                    'approve',
                    null, // System auto-approval
                    'Auto-approved based on store standing and content check'
                )
            } else {
                // Create moderation log for manual review
                await prisma.productModerationLog.create({
                    data: {
                        productId: product.id,
                        action: 'auto_review_required',
                        reason: moderationDecision.reasons.join('; '),
                        notes: `Risk level: ${moderationDecision.riskLevel}`,
                        previousStatus: 'PENDING',
                        newStatus: 'PENDING',
                        productSnapshot: JSON.stringify({
                            name: product.name,
                            description: product.description,
                            price: product.price,
                            category: product.category,
                            images: product.images
                        })
                    }
                })
            }
        } catch (error) {
            console.error('Moderation evaluation error:', error)
            // Continue with product creation even if moderation fails
        }

        // Create initial inventory log if stock is provided
        if (stock > 0) {
            await prisma.inventoryLog.create({
                data: {
                    productId: product.id,
                    changeType: 'initial_stock',
                    quantity: stock,
                    reason: 'Product creation'
                }
            })
        }

         return NextResponse.json({message: "Product added successfully"})

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get all products for a seller
export async function GET(request){
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if(!storeId){
            return NextResponse.json({error: 'not authorized'}, { status: 401 } )
        }
        const products = await prisma.product.findMany({
            where: { storeId },
            include: {
                mediaGallery: {
                    orderBy: { sortOrder: 'asc' }
                },
                attributeValues: {
                    include: {
                        template: true
                    }
                },
                moderationLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        })

        return NextResponse.json({products})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
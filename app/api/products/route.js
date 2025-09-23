import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { PricingEngine } from "@/lib/pricingEngine";


export async function GET(request){
    try {
        // Rate limiting: 100 requests per minute for public read operations
        const rateLimitResponse = await rateLimit(request, 100, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        let products = await prisma.product.findMany({
            where: {inStock: true, status: 'ACTIVE' },
            include: {
                rating: {
                    select: {
                        createdAt: true, rating: true, review: true,
                        user: {select: {name: true, image: true}}
                    }
                },
                store: true,
                promotionRules: {
                    where: { isActive: true }
                },
                mediaGallery: {
                    where: { isPrimary: true },
                    take: 1
                }
            },
            orderBy: {createdAt: 'desc'}
        })

        // remove products with store isActive false
        products = products.filter(product => product.store.isActive)

        // Calculate effective prices
        const productsWithPricing = products.map(product => {
            const pricing = PricingEngine.calculateEffectivePrice(product)
            return {
                ...product,
                effectivePrice: pricing.effectivePrice,
                originalPrice: pricing.originalPrice,
                isOnSale: pricing.isOnSale,
                discountAmount: pricing.discountAmount,
                discountPercentage: pricing.discountPercentage,
                appliedPromotions: pricing.appliedPromotions
            }
        })

        return NextResponse.json({products: productsWithPricing})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
    }
}
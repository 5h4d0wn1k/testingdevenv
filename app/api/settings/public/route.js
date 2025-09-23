import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

// GET public platform settings
export async function GET(request) {
    try {
        // Rate limiting: 100 requests per minute for public read operations
        const rateLimitResponse = await rateLimit(request, 100, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const settings = await prisma.platformSettings.findFirst();

        // Return only public fields
        const publicSettings = {
            siteName: settings?.siteName || null,
            logoUrl: settings?.logoUrl || null,
            faviconUrl: settings?.faviconUrl || null,
            primaryColor: settings?.primaryColor || null,
            maintenanceEnabled: settings?.maintenanceEnabled || false,
            maintenanceMessage: settings?.maintenanceMessage || null,
            facebookUrl: settings?.facebookUrl || null,
            twitterUrl: settings?.twitterUrl || null,
            instagramUrl: settings?.instagramUrl || null,
            linkedinUrl: settings?.linkedinUrl || null,
            youtubeUrl: settings?.youtubeUrl || null,
            tiktokUrl: settings?.tiktokUrl || null,
            baseCurrency: settings?.baseCurrency || 'USD',
            // SEO metadata fields
            metaTitle: settings?.metaTitle || null,
            metaDescription: settings?.metaDescription || null,
            metaKeywords: settings?.metaKeywords || null,
            ogTitle: settings?.ogTitle || null,
            ogDescription: settings?.ogDescription || null,
            ogImageUrl: settings?.ogImageUrl || null,
            // Content fields
            homepageBanner: settings?.homepageBanner || null,
            promotionalBanners: settings?.promotionalBanners || [],
            policyPages: settings?.policyPages || {
                terms: '',
                privacy: '',
                refund: ''
            },
        };

        // Add cache headers for public caching
        const response = NextResponse.json({ settings: publicSettings });
        response.headers.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes

        return response;

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
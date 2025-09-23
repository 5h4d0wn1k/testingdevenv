import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { encryptObject, decryptObject, SENSITIVE_FIELDS } from "@/lib/encryption";
import { sanitizeObject, SANITIZATION_SCHEMAS } from "@/lib/sanitization";

export async function GET(request) {
    try {
        // Rate limiting: 20 requests per minute
        const rateLimitResponse = await rateLimit(request, 20, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        const encryptedProfile = await prisma.vendorProfile.findUnique({
            where: { storeId }
        });

        if (!encryptedProfile) {
            return NextResponse.json({ profile: null });
        }

        // Decrypt sensitive fields for internal processing
        const profile = decryptObject(encryptedProfile, SENSITIVE_FIELDS.VENDOR_PROFILE);

        // Create a safe response by masking sensitive fields
        const safeProfile = { ...profile };
        SENSITIVE_FIELDS.VENDOR_PROFILE.forEach(field => {
            if (safeProfile[field]) {
                // Mask sensitive data - show first/last few characters
                const value = safeProfile[field];
                if (value.length <= 4) {
                    safeProfile[field] = '*'.repeat(value.length);
                } else {
                    safeProfile[field] = value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
                }
            }
        });

        return NextResponse.json({ profile: safeProfile });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        // Rate limiting: 10 requests per minute
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        const body = await request.json();

        // Sanitize input data
        const sanitizedData = sanitizeObject(body, SANITIZATION_SCHEMAS.VENDOR_PROFILE);

        const {
            businessName,
            taxId,
            businessAddress,
            contactPerson,
            phone,
            website,
            description,
            bankName,
            accountNumber,
            routingNumber,
            accountHolderName,
            bankAddress,
            termsAccepted,
            logoUrl,
            bannerUrl,
            primaryColor,
            secondaryColor,
            aboutPage,
            customDomain,
            seoTitle,
            seoDescription,
            seoKeywords
        } = sanitizedData;

        // Validate required fields
        if (!businessName || !businessAddress || !contactPerson || !phone) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Prepare data for storage - encrypt sensitive fields
        const dataToStore = {
            businessName,
            taxId,
            businessAddress,
            contactPerson,
            phone,
            website,
            description,
            bankName,
            accountNumber,
            routingNumber,
            accountHolderName,
            bankAddress,
            termsAccepted,
            logoUrl,
            bannerUrl,
            primaryColor,
            secondaryColor,
            aboutPage,
            customDomain,
            seoTitle,
            seoDescription,
            seoKeywords
        };

        // Encrypt sensitive fields before storing
        const encryptedData = encryptObject(dataToStore, SENSITIVE_FIELDS.VENDOR_PROFILE);

        // Update VendorProfile with encrypted data
        const profile = await prisma.vendorProfile.upsert({
            where: { storeId },
            update: encryptedData,
            create: {
                storeId,
                ...encryptedData
            }
        });

        // Return success message (don't return the encrypted profile)
        return NextResponse.json({
            message: "Profile updated successfully",
            success: true
        });
    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { sendNotification } from "@/lib/notifications";

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        await limiter.check(request, 10); // 10 requests per minute

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        const body = await request.json();
        const {
            businessName,
            taxId,
            businessAddress,
            contactPerson,
            phone,
            website,
            description,
            documents,
            termsAccepted
        } = body;

        // Validate required fields
        if (!businessName || !businessAddress || !contactPerson || !phone) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!termsAccepted) {
            return NextResponse.json({ error: "Terms must be accepted" }, { status: 400 });
        }

        // Create or update VendorProfile
        const profile = await prisma.vendorProfile.upsert({
            where: { storeId },
            update: {
                businessName,
                taxId,
                businessAddress,
                contactPerson,
                phone,
                website,
                description,
                termsAccepted
            },
            create: {
                storeId,
                businessName,
                taxId,
                businessAddress,
                contactPerson,
                phone,
                website,
                description,
                termsAccepted
            }
        });

        // Create VendorDocuments
        if (documents && documents.length > 0) {
            await prisma.vendorDocument.createMany({
                data: documents.map(doc => ({
                    storeId,
                    documentType: doc.documentType || 'kyc',
                    documentUrl: doc.documentUrl,
                    status: 'pending'
                })),
                skipDuplicates: true
            });
        }

        // Send notification
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { name: true, email: true }
        });
        await sendNotification('vendor', {
            email: store.email,
            type: 'onboarding_submitted',
            storeName: store.name
        });

        return NextResponse.json({ message: "Onboarding submitted successfully", profile });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
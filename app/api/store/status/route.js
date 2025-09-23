import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
});

export async function GET(request) {
    try {
        await limiter.check(request, 20); // 20 requests per minute

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: {
                vendorStatus: true,
                vendorProfile: true,
                vendorDocuments: {
                    select: {
                        documentType: true,
                        status: true,
                        uploadedAt: true
                    }
                }
            }
        });

        return NextResponse.json({
            vendorStatus: store.vendorStatus,
            profileComplete: !!store.vendorProfile,
            documents: store.vendorDocuments
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
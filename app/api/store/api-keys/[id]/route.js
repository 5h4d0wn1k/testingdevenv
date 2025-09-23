import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
});

export async function DELETE(request, { params }) {
    try {
        await limiter.check(request, 10); // 10 requests per minute

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);
        const { id } = params;

        // Verify the API key belongs to the user
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                id,
                userId,
                isActive: true
            }
        });

        if (!apiKey) {
            return NextResponse.json({ error: "API key not found" }, { status: 404 });
        }

        // Soft delete by marking as inactive
        await prisma.apiKey.update({
            where: { id },
            data: { isActive: false }
        });

        // Log audit trail
        await prisma.auditLog.create({
            data: {
                storeId,
                userId,
                action: 'api_key_deleted',
                details: {
                    apiKeyId: id,
                    apiKeyName: apiKey.name,
                    timestamp: new Date().toISOString()
                }
            }
        });

        return NextResponse.json({
            message: "API key deleted successfully"
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
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

        // Verify the webhook belongs to the store
        const webhook = await prisma.webhook.findFirst({
            where: {
                id,
                storeId
            }
        });

        if (!webhook) {
            return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
        }

        // Delete the webhook
        await prisma.webhook.delete({
            where: { id }
        });

        // Log audit trail
        await prisma.auditLog.create({
            data: {
                storeId,
                userId,
                action: 'webhook_deleted',
                details: {
                    webhookId: id,
                    webhookName: webhook.name,
                    timestamp: new Date().toISOString()
                }
            }
        });

        return NextResponse.json({
            message: "Webhook deleted successfully"
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
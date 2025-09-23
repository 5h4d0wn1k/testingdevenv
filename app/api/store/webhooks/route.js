import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { z } from 'zod';
import crypto from 'crypto';

const createWebhookSchema = z.object({
    name: z.string().min(1, 'Webhook name is required').max(100, 'Name must be 100 characters or less'),
    url: z.string().url('Invalid URL format'),
    events: z.array(z.string()).min(1, 'At least one event must be selected')
});

const validEvents = [
    'order.created',
    'order.updated',
    'order.cancelled',
    'fulfillment.shipped',
    'fulfillment.delivered',
    'return.requested',
    'return.approved',
    'refund.processed'
];

export async function GET(request) {
    try {
        // Rate limiting: 20 requests per minute
        const rateLimitResponse = await rateLimit(request, 20, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        const webhooks = await prisma.webhook.findMany({
            where: { storeId },
            select: {
                id: true,
                name: true,
                url: true,
                events: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ webhooks });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        // Rate limiting: 5 requests per minute for creation
        const rateLimitResponse = await rateLimit(request, 5, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        const body = await request.json();
        const { name, url, events } = createWebhookSchema.parse(body);

        // Validate events
        const invalidEvents = events.filter(event => !validEvents.includes(event));
        if (invalidEvents.length > 0) {
            return NextResponse.json({
                error: "Invalid events",
                details: `The following events are not supported: ${invalidEvents.join(', ')}`
            }, { status: 400 });
        }

        // Generate webhook secret
        const secret = crypto.randomBytes(32).toString('hex');

        const webhook = await prisma.webhook.create({
            data: {
                storeId,
                name,
                url,
                events,
                secret
            },
            select: {
                id: true,
                name: true,
                url: true,
                events: true,
                isActive: true,
                createdAt: true
            }
        });

        // Log audit trail
        await prisma.auditLog.create({
            data: {
                storeId,
                userId,
                action: 'webhook_created',
                details: {
                    webhookId: webhook.id,
                    webhookName: name,
                    events: events,
                    timestamp: new Date().toISOString()
                }
            }
        });

        return NextResponse.json({
            message: "Webhook created successfully",
            webhook
        });
    } catch (error) {
        console.error(error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: "Validation failed",
                details: error.errors
            }, { status: 400 });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
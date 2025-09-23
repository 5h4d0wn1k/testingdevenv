import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { z } from 'zod';
import crypto from 'crypto';

const createApiKeySchema = z.object({
    name: z.string().min(1, 'API key name is required').max(100, 'Name must be 100 characters or less')
});

export async function GET(request) {
    try {
        // Rate limiting: 20 requests per minute
        const rateLimitResponse = await rateLimit(request, 20, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        const apiKeys = await prisma.apiKey.findMany({
            where: {
                userId,
                isActive: true
            },
            select: {
                id: true,
                name: true,
                createdAt: true,
                // Don't return the actual key for security
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ apiKeys });
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
        const { name } = createApiKeySchema.parse(body);

        // Generate a secure API key
        const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;

        const newApiKey = await prisma.apiKey.create({
            data: {
                userId,
                name,
                key: apiKey,
                permissions: ['read', 'write'] // Default permissions
            },
            select: {
                id: true,
                name: true,
                key: true, // Return the key only on creation
                createdAt: true
            }
        });

        // Log audit trail
        await prisma.auditLog.create({
            data: {
                storeId,
                userId,
                action: 'api_key_created',
                details: {
                    apiKeyId: newApiKey.id,
                    apiKeyName: name,
                    timestamp: new Date().toISOString()
                }
            }
        });

        return NextResponse.json({
            message: "API key created successfully",
            apiKey: newApiKey
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
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { sanitizeObject, SANITIZATION_SCHEMAS } from "@/lib/sanitization";
import logger from "@/lib/logger";
import crypto from 'crypto';

// Get all API keys for user
export async function GET(request) {
    try {
        // Rate limiting: 30 requests per minute
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKeys = await prisma.apiKey.findMany({
            where: { userId, isActive: true },
            select: {
                id: true,
                name: true,
                permissions: true,
                createdAt: true
            }
        });

        return NextResponse.json({ apiKeys });
    } catch (error) {
        logger.logError('API keys retrieval error', error, { userId });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Generate new API key
export async function POST(request) {
    try {
        // Rate limiting: 5 requests per minute
        const rateLimitResponse = await rateLimit(request, 5, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, permissions } = await request.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Check if user already has 5 active keys (limit)
        const activeKeysCount = await prisma.apiKey.count({
            where: { userId, isActive: true }
        });

        if (activeKeysCount >= 5) {
            return NextResponse.json({ error: 'Maximum 5 active API keys allowed' }, { status: 400 });
        }

        // Generate unique API key
        const key = `ak_${crypto.randomBytes(32).toString('hex')}`;

        const apiKey = await prisma.apiKey.create({
            data: {
                userId,
                name,
                key,
                permissions: permissions || []
            },
            select: {
                id: true,
                name: true,
                permissions: true,
                createdAt: true
            }
        });

        logger.logBusinessEvent('API key generated', { userId, apiKeyId: apiKey.id });

        // Return key only once
        return NextResponse.json({
            apiKey: { ...apiKey, key },
            message: 'API key generated successfully. Store this key securely as it will not be shown again.'
        });
    } catch (error) {
        logger.logError('API key generation error', error, { userId });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Revoke API key
export async function DELETE(request) {
    try {
        // Rate limiting: 10 requests per minute
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const apiKeyId = searchParams.get('id');

        if (!apiKeyId) {
            return NextResponse.json({ error: 'API key ID is required' }, { status: 400 });
        }

        // Check if API key belongs to user
        const apiKey = await prisma.apiKey.findFirst({
            where: { id: apiKeyId, userId, isActive: true }
        });

        if (!apiKey) {
            return NextResponse.json({ error: 'API key not found' }, { status: 404 });
        }

        // Soft delete by setting isActive to false
        await prisma.apiKey.update({
            where: { id: apiKeyId },
            data: { isActive: false }
        });

        logger.logBusinessEvent('API key revoked', { userId, apiKeyId });

        return NextResponse.json({ message: 'API key revoked successfully' });
    } catch (error) {
        logger.logError('API key revocation error', error, { userId });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
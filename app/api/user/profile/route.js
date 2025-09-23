import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { sanitizeObject, SANITIZATION_SCHEMAS } from "@/lib/sanitization";
import logger from "@/lib/logger";

// Get user profile
export async function GET(request) {
    try {
        // Rate limiting: 30 requests per minute
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                phone: true,
                isPhoneVerified: true,
                isEmailVerified: true,
                twoFactorEnabled: true,
                notificationPreferences: true,
                createdAt: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        logger.logError('User profile retrieval error', error, { userId });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Update user profile
export async function PUT(request) {
    try {
        // Rate limiting: 10 requests per minute
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, phone, notificationPreferences } = body;

        // Sanitize input
        const sanitizedData = sanitizeObject(
            { name, phone, notificationPreferences },
            SANITIZATION_SCHEMAS.USER_PROFILE
        );

        // Validate required fields
        if (!sanitizedData.name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name: sanitizedData.name,
                phone: sanitizedData.phone,
                notificationPreferences: sanitizedData.notificationPreferences || {}
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                phone: true,
                isPhoneVerified: true,
                isEmailVerified: true,
                twoFactorEnabled: true,
                notificationPreferences: true
            }
        });

        logger.logBusinessEvent('User profile updated', { userId });

        return NextResponse.json({ user: updatedUser, message: 'Profile updated successfully' });
    } catch (error) {
        logger.logError('User profile update error', error, { userId });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
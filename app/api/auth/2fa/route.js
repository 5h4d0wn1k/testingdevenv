import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import logger from "@/lib/logger";

// Get 2FA status
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
                role: true,
                twoFactorEnabled: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if user is Admin or Staff
        const isElevatedRole = ['ADMIN', 'STAFF'].includes(user.role);

        return NextResponse.json({
            twoFactorEnabled: user.twoFactorEnabled,
            isElevatedRole,
            canEnable2FA: isElevatedRole
        });
    } catch (error) {
        logger.logError('2FA status check error', error, { userId });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Enable/Disable 2FA
export async function PUT(request) {
    try {
        // Rate limiting: 5 requests per minute
        const rateLimitResponse = await rateLimit(request, 5, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { enable } = await request.json();

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                role: true,
                twoFactorEnabled: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Only Admin and Staff can enable 2FA
        if (enable && !['ADMIN', 'STAFF'].includes(user.role)) {
            return NextResponse.json({ error: '2FA is only available for Admin and Staff roles' }, { status: 403 });
        }

        // Update 2FA status
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: enable
            }
        });

        logger.logBusinessEvent('2FA status updated', { userId, enabled: enable });

        return NextResponse.json({
            message: `2FA ${enable ? 'enabled' : 'disabled'} successfully`,
            twoFactorEnabled: enable
        });
    } catch (error) {
        logger.logError('2FA update error', error, { userId });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
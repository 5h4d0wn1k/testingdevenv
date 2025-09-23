import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { sanitizeEmail } from "@/lib/sanitization";
import logger from "@/lib/logger";
import crypto from 'crypto';
import { sendEmail } from "@/lib/email";

// Send magic link
export async function POST(request) {
    try {
        // Rate limiting: 5 requests per hour for magic links
        const rateLimitResponse = await rateLimit(request, 5, 60 * 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const sanitizedEmail = sanitizeEmail(email);

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: sanitizedEmail }
        });

        if (!user) {
            // Don't reveal if email exists or not
            return NextResponse.json({ message: 'If the email exists, a magic link has been sent' });
        }

        // Generate magic link token
        const magicToken = crypto.randomBytes(32).toString('hex');
        const magicExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Update user with magic token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                magicLinkToken: magicToken,
                magicLinkExpires: magicExpires
            }
        });

        // Send magic link email
        const magicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/magic-link?token=${magicToken}`;

        await sendEmail({
            to: sanitizedEmail,
            subject: 'Your Magic Link',
            html: `
                <h2>Magic Link Login</h2>
                <p>Click the link below to sign in:</p>
                <a href="${magicUrl}">Sign In</a>
                <p>This link will expire in 15 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        });

        logger.logBusinessEvent('Magic link sent', { userId: user.id, email: sanitizedEmail });

        return NextResponse.json({ message: 'If the email exists, a magic link has been sent' });
    } catch (error) {
        logger.logError('Magic link request error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Verify magic link token
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        // Find user with valid magic token
        const user = await prisma.user.findFirst({
            where: {
                magicLinkToken: token,
                magicLinkExpires: {
                    gt: new Date()
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired magic link' }, { status: 400 });
        }

        // Clear magic token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                magicLinkToken: null,
                magicLinkExpires: null
            }
        });

        logger.logBusinessEvent('Magic link verified', { userId: user.id });

        // Return user data for frontend to handle sign-in
        return NextResponse.json({
            message: 'Magic link verified',
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        logger.logError('Magic link verification error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
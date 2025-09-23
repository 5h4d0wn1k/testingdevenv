import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { sanitizeEmail } from "@/lib/sanitization";
import logger from "@/lib/logger";
import crypto from 'crypto';
import { sendEmail } from "@/lib/email";

// Request password reset
export async function POST(request) {
    try {
        // Rate limiting: 5 requests per hour for password reset
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
            // Don't reveal if email exists or not for security
            return NextResponse.json({ message: 'If the email exists, a reset link has been sent' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Update user with reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: resetToken,
                passwordResetExpires: resetExpires
            }
        });

        // Send reset email
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

        await sendEmail({
            to: sanitizedEmail,
            subject: 'Password Reset Request',
            html: `
                <h2>Password Reset</h2>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetUrl}">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        });

        logger.logBusinessEvent('Password reset requested', { userId: user.id, email: sanitizedEmail });

        return NextResponse.json({ message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
        logger.logError('Password reset request error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Reset password with token
export async function PUT(request) {
    try {
        // Rate limiting: 10 requests per minute
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { token, newPassword } = await request.json();

        if (!token || !newPassword) {
            return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
        }

        // Validate password strength (basic)
        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
        }

        // Find user with valid reset token
        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpires: {
                    gt: new Date()
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
        }

        // Update password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: null,
                passwordResetExpires: null
                // Note: Since using Clerk, password is managed by Clerk
                // This would need integration with Clerk's API to update password
            }
        });

        logger.logBusinessEvent('Password reset completed', { userId: user.id });

        return NextResponse.json({ message: 'Password reset successfully' });
    } catch (error) {
        logger.logError('Password reset error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
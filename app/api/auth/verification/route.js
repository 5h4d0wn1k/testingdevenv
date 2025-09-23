import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { sanitizeEmail, sanitizePhone } from "@/lib/sanitization";
import logger from "@/lib/logger";
import { sendEmail } from "@/lib/email";

// Get verification status
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
                email: true,
                phone: true,
                isEmailVerified: true,
                isPhoneVerified: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            email: user.email,
            phone: user.phone,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified
        });
    } catch (error) {
        logger.logError('Verification status check error', error, { userId });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Send verification email/SMS
export async function POST(request) {
    try {
        // Rate limiting: 5 requests per hour
        const rateLimitResponse = await rateLimit(request, 5, 60 * 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type } = await request.json(); // 'email' or 'phone'

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                phone: true,
                isEmailVerified: true,
                isPhoneVerified: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (type === 'email') {
            if (user.isEmailVerified) {
                return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
            }

            // Send verification email
            await sendEmail({
                to: user.email,
                subject: 'Verify Your Email',
                html: `
                    <h2>Email Verification</h2>
                    <p>Please verify your email address by clicking the link below:</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/verify-email?userId=${userId}">Verify Email</a>
                    <p>If you didn't request this, please ignore this email.</p>
                `
            });

            logger.logBusinessEvent('Email verification sent', { userId, email: user.email });
            return NextResponse.json({ message: 'Verification email sent' });

        } else if (type === 'phone') {
            if (!user.phone) {
                return NextResponse.json({ error: 'Phone number not set' }, { status: 400 });
            }

            if (user.isPhoneVerified) {
                return NextResponse.json({ error: 'Phone already verified' }, { status: 400 });
            }

            // For SMS, you would integrate with an SMS service like Twilio
            // For now, just log it
            logger.logBusinessEvent('Phone verification requested', { userId, phone: user.phone });
            return NextResponse.json({ message: 'Verification SMS sent (simulated)' });

        } else {
            return NextResponse.json({ error: 'Invalid verification type' }, { status: 400 });
        }
    } catch (error) {
        logger.logError('Verification request error', error, { userId });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Verify email/phone
export async function PUT(request) {
    try {
        // Rate limiting: 10 requests per minute
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type, code } = await request.json(); // 'email' or 'phone', and verification code

        if (!type || !code) {
            return NextResponse.json({ error: 'Type and verification code are required' }, { status: 400 });
        }

        // For simplicity, accept any code for now (in real implementation, verify against sent code)
        const updateData = type === 'email'
            ? { isEmailVerified: true }
            : { isPhoneVerified: true };

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        logger.logBusinessEvent(`${type} verified`, { userId });

        return NextResponse.json({ message: `${type} verified successfully` });
    } catch (error) {
        logger.logError('Verification error', error, { userId });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/lib/rbac";
import { rateLimit } from "@/lib/rateLimit";
import logger from "@/lib/logger";
import { decryptObject, SENSITIVE_FIELDS } from "@/lib/encryption";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// GET - Get payout history and pending payouts
export async function GET(request) {
    try {
        // Rate limiting: 30 requests per minute
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        // RBAC check
        const rbacResult = await requirePermission(PERMISSIONS.PAYOUT_READ)(request);
        if (rbacResult.error) {
            return NextResponse.json({ error: rbacResult.error }, { status: rbacResult.status });
        }

        // Get store ID
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { store: true }
        });

        if (!user?.store) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const storeId = user.store.id;

        // Get payout history
        const payouts = await prisma.payout.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate pending payout amount
        const pendingPayouts = payouts.filter(p => p.status === 'PENDING');
        const pendingAmount = pendingPayouts.reduce((sum, payout) => sum + payout.amount, 0);

        // Get current balance from vendor financials
        const vendorFinancials = await prisma.vendorFinancial.findUnique({
            where: { storeId }
        });

        const currentBalance = vendorFinancials?.currentBalance || 0;

        // Calculate next payout date (simplified - every 15th and last day of month)
        const nextPayoutDate = new Date();
        if (nextPayoutDate.getDate() < 15) {
            nextPayoutDate.setDate(15);
        } else {
            nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1, 1);
        }

        // Get Stripe Connect account info if available
        let stripeAccount = null;
        if (user.store.stripeAccountId) {
            try {
                stripeAccount = await stripe.accounts.retrieve(user.store.stripeAccountId);
            } catch (error) {
                logger.logError('Stripe account retrieval error', error, { storeId });
            }
        }

        const responseData = {
            payouts: payouts.map(payout => ({
                id: payout.id,
                amount: payout.amount,
                status: payout.status,
                payoutDate: payout.payoutDate,
                scheduledDate: payout.scheduledDate,
                createdAt: payout.createdAt
            })),
            summary: {
                pendingAmount,
                currentBalance,
                nextPayoutDate: nextPayoutDate.toISOString().split('T')[0],
                totalPaid: payouts.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0),
                totalPending: pendingAmount
            },
            stripeAccount: stripeAccount ? {
                id: stripeAccount.id,
                charges_enabled: stripeAccount.charges_enabled,
                payouts_enabled: stripeAccount.payouts_enabled,
                requirements: stripeAccount.requirements
            } : null
        };

        // Audit logging
        await prisma.auditLog.create({
            data: {
                userId,
                storeId,
                action: 'PAYOUTS_READ',
                details: { payoutCount: payouts.length }
            }
        });

        return NextResponse.json(responseData);
    } catch (error) {
        logger.logError('Payout read error', error, { userId });
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

// POST - Create a payout request
export async function POST(request) {
    try {
        // Rate limiting: 10 requests per minute for payout creation
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        // RBAC check
        const rbacResult = await requirePermission(PERMISSIONS.PAYOUT_CREATE)(request);
        if (rbacResult.error) {
            return NextResponse.json({ error: rbacResult.error }, { status: rbacResult.status });
        }

        // Get store ID
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { store: true }
        });

        if (!user?.store) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const storeId = user.store.id;

        // Get current balance
        const vendorFinancials = await prisma.vendorFinancial.findUnique({
            where: { storeId }
        });

        const currentBalance = vendorFinancials?.currentBalance || 0;

        if (currentBalance <= 0) {
            return NextResponse.json({ error: 'Insufficient balance for payout' }, { status: 400 });
        }

        // Check if Stripe Connect account is set up
        if (!user.store.stripeAccountId) {
            return NextResponse.json({ error: 'Stripe Connect account not configured' }, { status: 400 });
        }

        // Create payout record
        const payout = await prisma.payout.create({
            data: {
                storeId,
                amount: currentBalance,
                status: 'PENDING',
                scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next day
            }
        });

        // Update vendor financials
        await prisma.vendorFinancial.update({
            where: { storeId },
            data: {
                currentBalance: 0,
                totalPayouts: {
                    increment: currentBalance
                },
                updatedAt: new Date()
            }
        });

        // Try to initiate Stripe payout
        try {
            if (user.store.stripeAccountId) {
                const stripePayout = await stripe.payouts.create({
                    amount: Math.round(currentBalance * 100), // Convert to cents
                    currency: 'usd',
                }, {
                    stripeAccount: user.store.stripeAccountId
                });

                // Update payout with Stripe payout ID
                await prisma.payout.update({
                    where: { id: payout.id },
                    data: {
                        status: 'PAID',
                        payoutDate: new Date()
                    }
                });
            }
        } catch (stripeError) {
            logger.logError('Stripe payout error', stripeError, { storeId, payoutId: payout.id });
            // Don't fail the request, just log the error
        }

        // Audit logging
        await prisma.auditLog.create({
            data: {
                userId,
                storeId,
                action: 'PAYOUT_CREATED',
                details: { payoutId: payout.id, amount: currentBalance }
            }
        });

        return NextResponse.json({
            message: 'Payout request created successfully',
            payout: {
                id: payout.id,
                amount: payout.amount,
                status: payout.status,
                scheduledDate: payout.scheduledDate
            }
        });
    } catch (error) {
        logger.logError('Payout creation error', error, { userId });
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
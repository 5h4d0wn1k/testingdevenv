import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { idParamSchema } from "@/lib/validations";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// GET /api/admin/payouts/[id] - Get payout details with summary
export async function GET(request, { params }) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { id } = params;

        const validation = idParamSchema.safeParse(id)
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const validatedId = validation.data

        const payout = await prisma.payout.findUnique({
            where: { id: validatedId },
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        stripeAccountId: true
                    }
                }
            }
        });

        if (!payout) {
            return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
        }

        // Calculate summary: sales and fees
        // Find orders that contributed to this payout (unpaid commissions at creation time)
        // Since commissionPaid is set when payout is created, we need to sum orders where commissionPaid was false
        // But since it's already set, perhaps sum all orders for the store in the period, but that's not accurate.
        // For simplicity, assume fees = payout.amount, sales = fees / (1 - avg_rate) but better to query orders.
        const orders = await prisma.order.findMany({
            where: {
                storeId: payout.storeId,
                commissionPaid: true, // Since payout marks them as paid
                createdAt: {
                    gte: payout.createdAt // Approximate period
                }
            },
            select: {
                total: true,
                totalCommission: true
            }
        });

        const sales = orders.reduce((sum, order) => sum + order.total, 0);
        const fees = orders.reduce((sum, order) => sum + order.totalCommission, 0);

        return NextResponse.json({
            payout,
            summary: {
                sales,
                fees
            }
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

// PUT /api/admin/payouts/[id] - Approve a payout (set status to PAID)
export async function PUT(request, { params }) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { id } = params;

        const validation = idParamSchema.safeParse(id)
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const validatedId = validation.data

        // Check if payout exists and is pending
        const payout = await prisma.payout.findUnique({
            where: { id: validatedId },
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true
                    }
                }
            }
        });

        if (!payout) {
            return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
        }

        if (payout.status !== 'PENDING') {
            return NextResponse.json({ error: 'Payout is not pending' }, { status: 400 });
        }

        // Check if store has Stripe Connect account
        if (!payout.store.stripeAccountId) {
            return NextResponse.json({ error: 'Store does not have a Stripe Connect account set up' }, { status: 400 });
        }

        // Create Stripe transfer
        let transfer;
        try {
            transfer = await stripe.transfers.create({
                amount: Math.round(payout.amount * 100), // Convert to cents
                currency: 'usd',
                destination: payout.store.stripeAccountId,
                transfer_group: `payout_${validatedId}`,
                metadata: {
                    payoutId: validatedId,
                    storeId: payout.storeId,
                    storeName: payout.store.name
                }
            });
        } catch (stripeError) {
            console.error('Stripe transfer error:', stripeError);
            // Update payout to FAILED
            await prisma.payout.update({
                where: { id: validatedId },
                data: { status: 'FAILED' }
            });
            return NextResponse.json({ error: 'Stripe transfer failed: ' + stripeError.message }, { status: 400 });
        }

        // Update payout to PAID
        const updatedPayout = await prisma.payout.update({
            where: { id: validatedId },
            data: {
                status: 'PAID',
                payoutDate: new Date()
            },
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        stripeAccountId: true
                    }
                }
            }
        });

        // Mark corresponding order commissions as paid
        // Find orders for this store that have unpaid commissions up to the payout amount
        const unpaidOrders = await prisma.order.findMany({
            where: {
                storeId: updatedPayout.storeId,
                commissionPaid: false,
                totalCommission: { gt: 0 }
            },
            orderBy: { createdAt: 'asc' }
        });

        let remainingPayout = updatedPayout.amount;
        for (const order of unpaidOrders) {
            if (remainingPayout >= order.totalCommission) {
                await prisma.order.update({
                    where: { id: order.id },
                    data: { commissionPaid: true }
                });
                remainingPayout -= order.totalCommission;
                console.log(`[COMMISSION_DEBUG] Marked order ${order.id} commission as paid: $${order.totalCommission}`);
            } else {
                // Partial payment - this shouldn't happen in normal flow
                console.log(`[COMMISSION_DEBUG] Partial commission payment for order ${order.id}: $${remainingPayout} of $${order.totalCommission}`);
                break;
            }
        }

        console.log(`[COMMISSION_DEBUG] Payout approved for store ${updatedPayout.store.name}: $${updatedPayout.amount}`);

        return NextResponse.json({
            message: 'Payout approved successfully',
            payout: updatedPayout
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
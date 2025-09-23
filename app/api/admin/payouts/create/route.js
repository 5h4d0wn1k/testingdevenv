import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { payoutCreateSchema } from "@/lib/validations";
import { sendNotification } from "@/lib/notifications";

// POST /api/admin/payouts/create - Create payouts for stores with unpaid commissions
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { storeId } = await request.json();

        const validation = payoutCreateSchema.safeParse({storeId})
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        let whereClause = {};
        if (validation.data.storeId) {
            whereClause.storeId = validation.data.storeId;
        }

        // Find all stores with unpaid commissions
        const storesWithCommissions = await prisma.store.findMany({
            where: whereClause,
            include: {
                orders: {
                    where: {
                        commissionPaid: false,
                        totalCommission: { gt: 0 }
                    },
                    select: {
                        totalCommission: true
                    }
                }
            }
        });

        const payoutsCreated = await prisma.$transaction(async (tx) => {
            const payouts = [];
            for (const store of storesWithCommissions) {
                const totalUnpaidCommission = store.orders.reduce(
                    (sum, order) => sum + order.totalCommission,
                    0
                );

                console.log(`[COMMISSION_DEBUG] Store ${store.name} (ID: ${store.id}) has ${store.orders.length} unpaid orders with total commission: $${totalUnpaidCommission}`);
                store.orders.forEach(order => {
                    console.log(`[COMMISSION_DEBUG] Order ID: ${order.id}, totalCommission: $${order.totalCommission}, commissionPaid: ${order.commissionPaid}`);
                });

                if (totalUnpaidCommission > 0) {
                    // Check if there's already a pending payout for this store
                    const existingPayout = await tx.payout.findFirst({
                        where: {
                            storeId: store.id,
                            status: 'PENDING'
                        }
                    });

                    if (!existingPayout) {
                        const payout = await tx.payout.create({
                            data: {
                                storeId: store.id,
                                amount: totalUnpaidCommission
                            },
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

                        // DO NOT update commissionPaid status here - only mark as paid when payout is actually approved/transferred
                        // This prevents commissions from being marked as paid before the payout is processed

                        payouts.push(payout);
                        console.log(`[COMMISSION_DEBUG] Created payout for ${store.name}: $${totalUnpaidCommission}`);
                        console.log(`[COMMISSION_DEBUG] Payout created but commissions not yet marked as paid`);
                    } else {
                        console.log(`[COMMISSION_DEBUG] Pending payout already exists for ${store.name}`);
                    }
                }
            }
            return payouts;
        });

        sendNotification('payout', { payoutsCreated })

        return NextResponse.json({
            message: `Created ${payoutsCreated.length} payouts`,
            payouts: payoutsCreated
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
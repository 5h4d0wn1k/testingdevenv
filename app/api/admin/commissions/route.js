import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { commissionSchema } from "@/lib/validations";
import logger from "@/lib/logger.js";

// GET /api/admin/commissions - Fetch all commission rates
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const commissionRates = await prisma.commissionRate.findMany({
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ commissionRates });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

// POST /api/admin/commissions - Create or update commission rates
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { storeId, rate } = await request.json();

        const validation = commissionSchema.safeParse({storeId, rate})
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const { storeId: validatedStoreId, rate: validatedRate } = validation.data

        // Check if store exists
        const store = await prisma.store.findUnique({
            where: { id: validatedStoreId }
        });

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        // Check if commission rate already exists for this store
        const existingRate = await prisma.commissionRate.findUnique({
            where: { storeId: validatedStoreId }
        });

        // Additional validation for edge cases
        if (validatedRate < 0) {
            return NextResponse.json({ error: 'Commission rate cannot be negative' }, { status: 400 });
        }
        if (validatedRate > 100) {
            return NextResponse.json({ error: 'Commission rate cannot exceed 100%' }, { status: 400 });
        }
        if (isNaN(validatedRate)) {
            return NextResponse.json({ error: 'Commission rate must be a valid number' }, { status: 400 });
        }

        const commissionRate = await prisma.$transaction(async (tx) => {
            let oldRate = null;
            if (existingRate) {
                oldRate = existingRate.rate;
                // Update existing rate
                return await tx.commissionRate.update({
                    where: { storeId: validatedStoreId },
                    data: {
                        rate: validatedRate,
                        adminUserId: userId
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
            } else {
                // Create new rate
                return await tx.commissionRate.create({
                    data: {
                        storeId: validatedStoreId,
                        rate: validatedRate,
                        adminUserId: userId
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
            }
        });

        // Audit logging
        try {
            await prisma.auditLog.create({
                data: {
                    userId: userId,
                    storeId: validatedStoreId,
                    action: existingRate ? 'UPDATE_COMMISSION_RATE' : 'CREATE_COMMISSION_RATE',
                    details: {
                        storeId: validatedStoreId,
                        oldRate: existingRate ? existingRate.rate : null,
                        newRate: validatedRate,
                        storeName: commissionRate.store.name
                    }
                }
            });
            logger.logBusinessEvent('commission_rate_changed', {
                adminUserId: userId,
                storeId: validatedStoreId,
                action: existingRate ? 'update' : 'create',
                oldRate: existingRate ? existingRate.rate : null,
                newRate: validatedRate
            });
        } catch (auditError) {
            logger.logError('Failed to create audit log for commission rate change', auditError);
            // Don't fail the request for audit log failure
        }

        return NextResponse.json({
            message: existingRate ? 'Commission rate updated successfully' : 'Commission rate created successfully',
            commissionRate
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
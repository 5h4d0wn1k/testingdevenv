import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { platformSettingsSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import { encrypt, decrypt } from "@/lib/encryption";
import logger from "@/lib/logger.js";

// GET platform settings
export async function GET(request) {
    try {
        // Rate limiting: 60 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 60, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const settings = await prisma.platformSettings.findFirst();

        // Exclude sensitive fields from response
        const { smtpPassword, stripeSecretKey, imageKitPrivateKey, ...safeSettings } = settings || {};

        return NextResponse.json({ settings: safeSettings });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

// PUT platform settings (replace entire object)
export async function PUT(request) {
    try {
        // Rate limiting: 60 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 60, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const data = await request.json();

        const validation = platformSettingsSchema.safeParse(data)
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        // Encrypt SMTP password if provided
        const dataToSave = { ...validation.data };
        if (dataToSave.smtpPassword) {
            dataToSave.smtpPassword = encrypt(dataToSave.smtpPassword);
        }

        const settings = await prisma.platformSettings.upsert({
            where: { id: 1 },
            update: dataToSave,
            create: { id: 1, ...dataToSave },
        });

        return NextResponse.json({ settings });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

// PATCH platform settings (partial update)
export async function PATCH(request) {
    try {
        // Rate limiting: 60 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 60, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const updates = await request.json();
        console.log('DEBUG: PATCH updates received:', updates)

        const validation = platformSettingsSchema.safeParse(updates)
        if (!validation.success) {
            console.error('DEBUG: Validation failed for updates:', validation.error.errors)
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        // Get current settings
        const current = await prisma.platformSettings.findFirst();

        // Merge updates
        const mergedData = { ...current, ...validation.data };

        // Encrypt SMTP password if provided in updates
        if (validation.data.smtpPassword) {
            mergedData.smtpPassword = encrypt(validation.data.smtpPassword);
        }

        const settings = await prisma.platformSettings.upsert({
            where: { id: 1 },
            update: mergedData,
            create: { id: 1, ...mergedData },
        });

        // Audit logging for commission rate changes
        const commissionFields = ['globalCommissionRate', 'categoryCommissionRates'];
        const hasCommissionChanges = commissionFields.some(field => field in updates);

        if (hasCommissionChanges) {
            try {
                const changes = {};
                commissionFields.forEach(field => {
                    if (field in updates) {
                        changes[field] = {
                            oldValue: current ? current[field] : null,
                            newValue: updates[field]
                        };
                    }
                });

                await prisma.auditLog.create({
                    data: {
                        userId: userId,
                        action: 'UPDATE_PLATFORM_COMMISSION_SETTINGS',
                        details: changes
                    }
                });

                logger.logBusinessEvent('platform_commission_settings_updated', {
                    adminUserId: userId,
                    changes: changes
                });
            } catch (auditError) {
                logger.logError('Failed to create audit log for platform commission settings update', auditError);
                // Don't fail the request
            }
        }

        return NextResponse.json({ settings });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
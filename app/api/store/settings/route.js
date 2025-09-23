import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { z } from 'zod';

const settingsUpdateSchema = z.object({
    // Profile settings
    emailNotifications: z.boolean().optional(),
    orderNotifications: z.boolean().optional(),
    returnNotifications: z.boolean().optional(),
    payoutNotifications: z.boolean().optional(),

    // Store configuration
    operatingHours: z.record(z.object({
        open: z.string().optional(),
        close: z.string().optional()
    })).optional(),
    shippingOriginAddress: z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional()
    }).optional(),
    defaultShippingMethods: z.array(z.object({
        name: z.string().min(1, 'Shipping method name is required'),
        carrier: z.string().min(1, 'Carrier is required'),
        service: z.string().min(1, 'Service is required'),
        cost: z.number().min(0, 'Cost must be non-negative'),
        estimatedDays: z.number().int().min(1, 'Estimated days must be at least 1')
    })).optional()
});

export async function GET(request) {
    try {
        // Rate limiting: 20 requests per minute
        const rateLimitResponse = await rateLimit(request, 20, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        const settings = await prisma.vendorSettings.findUnique({
            where: { storeId }
        });

        return NextResponse.json({ settings });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        // Rate limiting: 10 requests per minute
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        const body = await request.json();

        // Validate input
        const validatedData = settingsUpdateSchema.parse(body);

        // Update VendorSettings
        const settings = await prisma.vendorSettings.upsert({
            where: { storeId },
            update: validatedData,
            create: {
                storeId,
                ...validatedData
            }
        });

        // Log audit trail
        await prisma.auditLog.create({
            data: {
                storeId,
                userId,
                action: 'settings_updated',
                details: {
                    updatedFields: Object.keys(validatedData),
                    timestamp: new Date().toISOString()
                }
            }
        });

        return NextResponse.json({
            message: "Settings updated successfully",
            settings
        });
    } catch (error) {
        console.error(error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: "Validation failed",
                details: error.errors
            }, { status: 400 });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
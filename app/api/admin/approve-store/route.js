import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { approveStoreSchema } from "@/lib/validations";
import { clerkClient } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/rateLimit";
import logger from "@/lib/logger";
import requestLogger from "@/lib/middleware/requestLogger";
import { sendEmail } from "@/lib/email";


// Approve Seller
export const POST = requestLogger(async (request) => {
    let userId;
    let validatedStoreId;
    try {
        // Rate limiting: 60 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 60, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const auth = getAuth(request);
        userId = auth.userId;
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const {storeId, status} = await request.json()

        const validation = approveStoreSchema.safeParse({storeId, status})
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const { storeId: validStoreId, status: validatedStatus } = validation.data;
        validatedStoreId = validStoreId;

        // Get store with user to assign role
        const store = await prisma.store.findUnique({
            where: { id: validatedStoreId },
            include: { user: true }
        })

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        let userRole = 'USER'
        if (validatedStatus === 'approved') {
            // Assign ADMIN role to designated users (those with ADMIN_EMAIL)
            const adminEmails = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.split(',') : []
            if (adminEmails.includes(store.user.email)) {
                userRole = 'ADMIN'
            } else {
                userRole = 'SELLER'
            }

            await prisma.$transaction(async (tx) => {
                await tx.store.update({
                    where: { id: validatedStoreId },
                    data: {
                        status: "approved",
                        isActive: true,
                        vendorStatus: "APPROVED"
                    }
                })
                await tx.user.update({
                    where: { id: store.userId },
                    data: { role: userRole }
                })
                // Update document status to approved
                await tx.vendorDocument.updateMany({
                    where: { storeId: validatedStoreId },
                    data: { status: 'approved' }
                })
            })

            // Send approval email
            await sendEmail({
                to: store.email,
                subject: 'Store Application Approved',
                html: `<p>Dear ${store.name},</p><p>Your store application has been approved. You can now start selling on our platform.</p><p>Best regards,<br>Admin Team</p>`
            })
            console.log('Store approved and role assigned:', { storeId: validatedStoreId, userId: store.userId, newRole: userRole })
            logger.logBusinessEvent('Store Approved', { storeId: validatedStoreId, userId: store.userId, adminId: userId, assignedRole: userRole })
        } else if (validatedStatus === 'rejected') {
            await prisma.$transaction(async (tx) => {
                await tx.store.update({
                    where: { id: validatedStoreId },
                    data: {
                        status: "rejected",
                        vendorStatus: "REJECTED"
                    }
                })
                await tx.user.update({
                    where: { id: store.userId },
                    data: { role: userRole }
                })
                // Update document status to rejected
                await tx.vendorDocument.updateMany({
                    where: { storeId: validatedStoreId },
                    data: { status: 'rejected' }
                })
            })
            console.log('Store rejected and role reset:', { storeId: validatedStoreId, userId: store.userId, newRole: userRole })
            logger.logBusinessEvent('Store Rejected', { storeId: validatedStoreId, userId: store.userId, adminId: userId })

            // Send rejection email
            await sendEmail({
                to: store.email,
                subject: 'Store Application Rejected',
                html: `<p>Dear ${store.name},</p><p>Your store application has been rejected. Please contact support for more details.</p><p>Best regards,<br>Admin Team</p>`
            })
        }

        return NextResponse.json({ message: validatedStatus + ' successfully' })

     } catch (error) {
         logger.logError('Error approving store', error, { adminId: userId, storeId: validatedStoreId });
         return NextResponse.json({ error: error.code || error.message }, { status: 400 })
     }
});

// get all pending and rejected stores
export const GET = requestLogger(async (request) => {
    let userId;
    try {
        // Rate limiting: 60 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 60, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const auth = getAuth(request);
        userId = auth.userId;
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const stores = await prisma.store.findMany({
            where: { status: { in: ["pending", "rejected"] }},
            include: {
                user: true,
                vendorProfile: true,
                vendorDocuments: true
            }
        })

        return NextResponse.json({ stores })

     } catch (error) {
         logger.logError('Error retrieving stores for approval', error, { adminId: userId });
         return NextResponse.json({ error: error.code || error.message }, { status: 400 })
     }
});
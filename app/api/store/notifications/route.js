import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { NextResponse } from "next/server";

// POST: Create notification for vendor (email and/or dashboard)
export async function POST(request) {
    try {
        const body = await request.json();
        const { storeId, title, message, type } = body;

        // Validate required fields
        if (!storeId || !title || !message || !type) {
            return NextResponse.json({ error: "storeId, title, message, and type are required" }, { status: 400 });
        }

        // Validate type
        const validTypes = ['EMAIL', 'DASHBOARD'];
        if (!validTypes.includes(type)) {
            return NextResponse.json({ error: "Invalid type. Must be EMAIL or DASHBOARD" }, { status: 400 });
        }

        // Verify store exists
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { id: true, email: true, name: true }
        });

        if (!store) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }

        // Send email if type is EMAIL
        if (type === 'EMAIL') {
            try {
                await sendEmail({
                    to: store.email,
                    subject: title,
                    text: message,
                    html: `<p>${message}</p>`
                });
            } catch (emailError) {
                console.error('Error sending notification email:', emailError);
                // Continue with creating notification even if email fails
            }
        }

        // Store in Notification model for dashboard inbox
        const notification = await prisma.notification.create({
            data: {
                title,
                message,
                type
            }
        });

        return NextResponse.json({
            notification,
            message: type === 'EMAIL' ? 'Notification sent via email' : 'Notification created for dashboard'
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating notification:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
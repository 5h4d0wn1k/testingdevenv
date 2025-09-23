import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { sanitizeString } from "@/lib/sanitization";

// GET: List tickets for authenticated vendor with optional filtering
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');

        const where = { storeId };

        if (status) {
            where.status = status;
        }

        if (priority) {
            where.priority = priority;
        }

        const tickets = await prisma.supportTicket.findMany({
            where,
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1 // Get latest message
                },
                order: {
                    select: { id: true, total: true, status: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json({ tickets });
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Create new support ticket
export async function POST(request) {
    try {
        // Rate limiting: 5 tickets per hour per user
        const rateLimitResult = await rateLimit(request, 5, 60 * 60 * 1000);
        if (rateLimitResult) {
            return rateLimitResult;
        }

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { subject, description, priority = "medium", category, orderId } = body;

        // Validate required fields
        if (!subject || !description || !category) {
            return NextResponse.json({ error: "Subject, description, and category are required" }, { status: 400 });
        }

        // Validate category
        const validCategories = ['order_issue', 'product_dispute', 'account_query'];
        if (!validCategories.includes(category)) {
            return NextResponse.json({ error: "Invalid category" }, { status: 400 });
        }

        // Validate priority
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
            return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
        }

        // Sanitize inputs
        const sanitizedSubject = sanitizeString(subject, { maxLength: 255 });
        const sanitizedDescription = sanitizeString(description, { maxLength: 2000 });

        // If orderId provided, verify it belongs to the store
        if (orderId) {
            const order = await prisma.order.findFirst({
                where: { id: orderId, storeId }
            });
            if (!order) {
                return NextResponse.json({ error: "Order not found or does not belong to your store" }, { status: 400 });
            }
        }

        const ticket = await prisma.supportTicket.create({
            data: {
                storeId,
                userId,
                orderId,
                subject: sanitizedSubject,
                description: sanitizedDescription,
                priority,
                category
            },
            include: {
                order: {
                    select: { id: true, total: true, status: true }
                }
            }
        });

        return NextResponse.json({ ticket }, { status: 201 });
    } catch (error) {
        console.error('Error creating support ticket:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
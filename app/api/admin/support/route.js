import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

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

        // Fetch all support tickets with relations
        const tickets = await prisma.supportTicket.findMany({
            include: {
                store: {
                    select: { name: true }
                },
                user: {
                    select: { name: true, email: true }
                },
                order: {
                    select: { id: true }
                },
                _count: {
                    select: { messages: true }
                }
            },
            orderBy: [
                {
                    priority: 'desc' // This will sort alphabetically, but we want high > medium > low
                },
                {
                    createdAt: 'desc'
                }
            ]
        });

        // Custom sort for priority (high > medium > low)
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        tickets.sort((a, b) => {
            const priorityA = priorityOrder[a.priority] || 2;
            const priorityB = priorityOrder[b.priority] || 2;
            if (priorityA !== priorityB) {
                return priorityB - priorityA; // Higher priority first
            }
            return new Date(b.createdAt) - new Date(a.createdAt); // Newer first
        });

        // Format response
        const formattedTickets = tickets.map(ticket => ({
            id: ticket.id,
            subject: ticket.subject,
            status: ticket.status,
            priority: ticket.priority,
            createdAt: ticket.createdAt,
            storeName: ticket.store?.name || null,
            userName: ticket.user?.name || null,
            messageCount: ticket._count.messages
        }));

        return NextResponse.json({ tickets: formattedTickets });

    } catch (error) {
        console.error('Error fetching support tickets:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
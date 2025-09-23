import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { sendNotification } from "@/lib/notifications";

export async function GET(request, { params }) {
    try {
        // Rate limiting: 60 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 60, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { id } = params;

        // Fetch single ticket with all messages
        const ticket = await prisma.supportTicket.findUnique({
            where: { id },
            include: {
                store: {
                    select: { id: true, name: true, email: true }
                },
                user: {
                    select: { id: true, name: true, email: true }
                },
                order: {
                    select: { id: true, total: true, currency: true }
                },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        // We can add user/store info if needed
                    }
                }
            }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        return NextResponse.json({ ticket });

    } catch (error) {
        console.error('Error fetching support ticket:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    try {
        // Rate limiting: 60 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 60, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { id } = params;
        const { message } = await request.json();

        if (!message || !message.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Verify ticket exists
        const ticket = await prisma.supportTicket.findUnique({
            where: { id },
            include: {
                store: { select: { email: true, name: true } },
                user: { select: { email: true, name: true } }
            }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Create admin reply
        const newMessage = await prisma.supportTicketMessage.create({
            data: {
                ticketId: id,
                senderId: userId,
                senderType: 'admin',
                message: message.trim()
            }
        });

        // Update ticket updatedAt
        await prisma.supportTicket.update({
            where: { id },
            data: { updatedAt: new Date() }
        });

        // Send notification
        const recipientEmail = ticket.user?.email || ticket.store?.email;
        const recipientName = ticket.user?.name || ticket.store?.name || 'User';

        if (recipientEmail) {
            await sendNotification('support', {
                email: recipientEmail,
                ticketId: id,
                subject: ticket.subject,
                message: message.trim(),
                replyFrom: 'Admin Support'
            });
        }

        return NextResponse.json({
            message: 'Reply sent successfully',
            newMessage
        });

    } catch (error) {
        console.error('Error sending admin reply:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        // Rate limiting: 60 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 60, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { id } = params;
        const { status } = await request.json();

        if (!status || !['ESCALATED', 'CLOSED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status. Must be ESCALATED or CLOSED' }, { status: 400 });
        }

        // Update ticket status
        const updatedTicket = await prisma.supportTicket.update({
            where: { id },
            data: {
                status: status,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({
            message: `Ticket ${status.toLowerCase()} successfully`,
            ticket: updatedTicket
        });

    } catch (error) {
        console.error('Error updating ticket status:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
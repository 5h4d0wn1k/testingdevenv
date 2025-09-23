import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// GET: Get single ticket details by ID (vendor can only access their own tickets)
export async function GET(request, { params }) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        const ticket = await prisma.supportTicket.findFirst({
            where: {
                id,
                storeId
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                },
                order: {
                    select: { id: true, total: true, status: true }
                }
            }
        });

        if (!ticket) {
            return NextResponse.json({ error: "Ticket not found or does not belong to your store" }, { status: 404 });
        }

        return NextResponse.json({ ticket });
    } catch (error) {
        console.error('Error fetching support ticket:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT: Update ticket status (only for vendor's tickets)
export async function PUT(request, { params }) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        const body = await request.json();
        const { status } = body;

        // Validate status
        const validStatuses = ['OPEN', 'IN_PROGRESS', 'CLOSED', 'RESOLVED', 'ESCALATED'];
        if (!status || !validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        // Check if ticket exists and belongs to store
        const existingTicket = await prisma.supportTicket.findFirst({
            where: {
                id,
                storeId
            }
        });

        if (!existingTicket) {
            return NextResponse.json({ error: "Ticket not found or does not belong to your store" }, { status: 404 });
        }

        const ticket = await prisma.supportTicket.update({
            where: { id },
            data: { status },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                },
                order: {
                    select: { id: true, total: true, status: true }
                }
            }
        });

        return NextResponse.json({ ticket });
    } catch (error) {
        console.error('Error updating support ticket:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
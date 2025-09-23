import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// GET: Return active announcements for vendors with optional type filter
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        const where = {
            isActive: true
        };

        if (type) {
            const validTypes = ['DOWNTIME', 'POLICY_UPDATE', 'SYSTEM'];
            if (validTypes.includes(type.toUpperCase())) {
                where.type = type.toUpperCase();
            }
        }

        const announcements = await prisma.announcement.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ announcements });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
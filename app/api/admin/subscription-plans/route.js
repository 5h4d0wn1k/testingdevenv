import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// GET /api/admin/subscription-plans - Get all plans
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { price: 'asc' }
        });

        return NextResponse.json({ plans });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/admin/subscription-plans - Create or update plan
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { id, name, description, price, commissionRate, listingLimit, features, registrationFee, listingFee, isActive } = await request.json();

        const planData = {
            name,
            description,
            price: parseFloat(price),
            commissionRate: parseFloat(commissionRate),
            listingLimit: parseInt(listingLimit),
            features: Array.isArray(features) ? features : [],
            registrationFee: parseFloat(registrationFee),
            listingFee: parseFloat(listingFee),
            isActive: Boolean(isActive)
        };

        let plan;
        if (id) {
            // Update
            plan = await prisma.subscriptionPlan.update({
                where: { id },
                data: planData
            });
        } else {
            // Create
            plan = await prisma.subscriptionPlan.create({
                data: planData
            });
        }

        return NextResponse.json({ plan });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/admin/subscription-plans - Delete plan
export async function DELETE(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { id } = await request.json();

        await prisma.subscriptionPlan.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Plan deleted successfully' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
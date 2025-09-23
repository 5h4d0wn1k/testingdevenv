import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

// Add admin by email
export async function POST(request){
    try {
        // Rate limiting: 10 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'email is required' }, { status: 400 });
        }

        // Find the user by email
        const user = await prisma.user.findFirst({
            where: { email: email }
        });

        if (!user) {
            return NextResponse.json({ error: 'user not found' }, { status: 404 });
        }

        // Update the role to ADMIN
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' }
        });

        return NextResponse.json({ message: 'User promoted to admin successfully', user: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role } });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
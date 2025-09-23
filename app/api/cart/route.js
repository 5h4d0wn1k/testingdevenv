import prisma from "@/lib/prisma";
import { getAuth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cartSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import logger from "@/lib/logger";
import requestLogger from "@/lib/middleware/requestLogger";


// Update user cart
export const POST = requestLogger(async (request) => {
    try {
        // Rate limiting: 30 requests per minute for order/cart operations
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        const { cart } = await request.json()

        const validation = cartSchema.safeParse(cart)
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Ensure user exists in DB
        let user = await prisma.user.findUnique({
            where: {id: userId}
        })

        if (!user) {
            const clerkUser = await currentUser()
            if (!clerkUser) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 })
            }
            user = await prisma.user.create({
                data: {
                    id: userId,
                    name: clerkUser.firstName + ' ' + clerkUser.lastName,
                    email: clerkUser.emailAddresses[0].emailAddress,
                    image: clerkUser.imageUrl
                }
            })
        }

        // Save the cart to the user object
        await prisma.user.update({
            where: {id: userId},
            data: {cart: cart}
        })

        return NextResponse.json({ message: 'Cart updated' })
    } catch (error) {
        logger.logError('Error updating cart', error, { userId });
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
});

// Get user cart
export const GET = requestLogger(async (request) => {
    try {
        // Rate limiting: 30 requests per minute for order/cart operations
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        logger.debug('Cart GET - userId', { userId })

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Ensure user exists in DB
        let user = await prisma.user.findUnique({
            where: {id: userId}
        })

        if (!user) {
            const clerkUser = await currentUser()
            if (!clerkUser) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 })
            }
            user = await prisma.user.create({
                data: {
                    id: userId,
                    name: clerkUser.firstName + ' ' + clerkUser.lastName,
                    email: clerkUser.emailAddresses[0].emailAddress,
                    image: clerkUser.imageUrl
                }
            })
        }

        logger.debug('Cart GET - user retrieved', { userId, hasCart: !!user.cart })

        return NextResponse.json({ cart: user.cart })
    } catch (error) {
        logger.logError('Error retrieving cart', error, { userId });
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
});
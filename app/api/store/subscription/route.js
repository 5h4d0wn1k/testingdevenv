import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { rateLimit } from "@/lib/rateLimit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// GET /api/store/subscription - Get available plans and current subscription
export async function GET(request) {
    try {
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        // Get available plans
        const plans = await prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        });

        // Get current subscription
        const profile = await prisma.vendorProfile.findUnique({
            where: { storeId },
            include: { subscriptionPlan: true }
        });

        return NextResponse.json({
            plans,
            currentSubscription: profile ? {
                plan: profile.subscriptionPlan,
                startDate: profile.subscriptionStartDate,
                endDate: profile.subscriptionEndDate,
                isActive: profile.isSubscriptionActive
            } : null
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/store/subscription - Subscribe or change plan
export async function POST(request) {
    try {
        const rateLimitResponse = await rateLimit(request, 5, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        const { planId } = await request.json();

        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: planId }
        });

        if (!plan) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const store = await prisma.store.findUnique({
            where: { id: storeId },
            include: { vendorProfile: true }
        });

        if (plan.name === 'free') {
            // Handle free plan
            await prisma.vendorProfile.update({
                where: { storeId },
                data: {
                    subscriptionPlanId: plan.id,
                    subscriptionStartDate: new Date(),
                    subscriptionEndDate: null, // No end for free
                    isSubscriptionActive: true
                }
            });
            return NextResponse.json({ message: 'Subscribed to free plan successfully' });
        }

        // Paid plan - handle with Stripe
        let customer;
        if (store.stripeAccountId) {
            customer = await stripe.customers.retrieve(store.stripeAccountId);
        } else {
            // Create Stripe customer
            customer = await stripe.customers.create({
                email: store.email,
                name: store.name,
                metadata: { storeId }
            });
            // Update store with customer id
            await prisma.store.update({
                where: { id: storeId },
                data: { stripeAccountId: customer.id }
            });
        }

        // Check if already has subscription
        const existingSubscription = store.vendorProfile?.subscriptionPlanId ?
            await stripe.subscriptions.list({
                customer: customer.id,
                status: 'active'
            }) : null;

        if (existingSubscription && existingSubscription.data.length > 0) {
            // Upgrade/downgrade existing subscription
            const sub = existingSubscription.data[0];
            await stripe.subscriptions.update(sub.id, {
                items: [{
                    id: sub.items.data[0].id,
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: plan.name,
                        },
                        unit_amount: plan.price * 100, // cents
                        recurring: {
                            interval: 'month'
                        }
                    }
                }],
                proration_behavior: 'create_prorations'
            });
        } else {
            // Create new subscription
            await stripe.subscriptions.create({
                customer: customer.id,
                items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: plan.name,
                        },
                        unit_amount: plan.price * 100,
                        recurring: {
                            interval: 'month'
                        }
                    }
                }],
                metadata: { storeId }
            });
        }

        // Update profile
        await prisma.vendorProfile.update({
            where: { storeId },
            data: {
                subscriptionPlanId: plan.id,
                subscriptionStartDate: new Date(),
                subscriptionEndDate: null, // Monthly recurring
                isSubscriptionActive: true
            }
        });

        return NextResponse.json({ message: 'Subscription updated successfully' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
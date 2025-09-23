import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { rateLimit } from "@/lib/rateLimit"
import logger from "@/lib/logger"
import requestLogger from "@/lib/middleware/requestLogger"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export const POST = requestLogger(async (request) => {
    try {
        // Rate limiting: 30 requests per minute for order/cart operations
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const body = await request.text()
        const sig = request.headers.get('stripe-signature')

        const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)

        const handlePaymentIntent = async (paymentIntentId, isPaid, eventType) => {
            const session = await stripe.checkout.sessions.list({
                payment_intent: paymentIntentId
            })

            const {orderIds, userId, appId} = session.data[0].metadata
            
            if(appId !== 'DavCreations'){
                return NextResponse.json({received: true, message: 'Invalid app id'})
            }

            const orderIdsArray = orderIds.split(',')

            if(isPaid){
                // mark order as paid
                await Promise.all(orderIdsArray.map(async (orderId) => {
                    await prisma.order.update({
                        where: {id: orderId},
                        data: {isPaid: true}
                    })
                }))
                // delete cart from user
                await prisma.user.update({
                    where: {id: userId},
                    data: {cart : {}}
                })
            }else{
                 // delete order from db
                 await Promise.all(orderIdsArray.map(async (orderId) => {
                    await prisma.order.delete({
                        where: {id: orderId}
                    })
                 }))
            }

            logger.logBusinessEvent(`Payment ${eventType}`, { paymentIntentId, userId, orderIds: orderIdsArray, isPaid })
        }

    
        const handleSubscription = async (subscription, eventType) => {
            const storeId = subscription.metadata.storeId;
            if (!storeId) return;

            if (eventType === 'created' || eventType === 'updated') {
                // Subscription active
                await prisma.vendorProfile.updateMany({
                    where: { storeId },
                    data: { isSubscriptionActive: true }
                });
            } else if (eventType === 'canceled') {
                // Subscription canceled
                await prisma.vendorProfile.updateMany({
                    where: { storeId },
                    data: { isSubscriptionActive: false }
                });
            }

            logger.logBusinessEvent(`Subscription ${eventType}`, { storeId, subscriptionId: subscription.id });
        };

        switch (event.type) {
            case 'payment_intent.succeeded': {
                await handlePaymentIntent(event.data.object.id, true, 'succeeded')
                break;
            }

            case 'payment_intent.canceled': {
                await handlePaymentIntent(event.data.object.id, false, 'canceled')
                break;
            }

            case 'customer.subscription.created': {
                await handleSubscription(event.data.object, 'created');
                break;
            }

            case 'customer.subscription.updated': {
                await handleSubscription(event.data.object, 'updated');
                break;
            }

            case 'customer.subscription.deleted': {
                await handleSubscription(event.data.object, 'canceled');
                break;
            }

            default:
                logger.warn('Unhandled Stripe event type', { eventType: event.type })
                break;
        }

        return NextResponse.json({received: true})
     } catch (error) {
         logger.logError('Stripe webhook error', error);
         return NextResponse.json({ error: error.message }, { status: 400 })
     }
});

export const config = {
    api: {bodyparser: false }
}
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { convertCurrency } from "@/lib/currency";
import { orderSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import logger from "@/lib/logger";
import requestLogger from "@/lib/middleware/requestLogger";
import { sendNotification } from "@/lib/notifications";
import { decryptObject, SENSITIVE_FIELDS } from "@/lib/encryption";
import { sanitizeObject, SANITIZATION_SCHEMAS } from "@/lib/sanitization";


export const POST = requestLogger(async (request) => {
    try {
        // Rate limiting: 30 requests per minute for order/cart operations
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId, has } = getAuth(request)
        if(!userId){
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }
        const { addressId, items, couponCode, paymentMethod } = await request.json()

        // Sanitize input data
        const sanitizedData = sanitizeObject(
            { addressId, items, couponCode, paymentMethod },
            SANITIZATION_SCHEMAS.ORDER
        )

        const validation = orderSchema.safeParse(sanitizedData)
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const { addressId: validatedAddressId, items: validatedItems, couponCode: validatedCouponCode, paymentMethod: validatedPaymentMethod } = validation.data

        // Get platform settings for currency and commissions
        const settings = await prisma.platformSettings.findFirst();
        const baseCurrency = settings?.baseCurrency || 'USD';
        const globalCommissionRate = settings?.globalCommissionRate;
        const categoryCommissionRates = settings?.categoryCommissionRates || {};

        let coupon = null;

        if (validatedCouponCode) {
        coupon = await prisma.coupon.findUnique({
                    where: {code: validatedCouponCode }
                })
                if (!coupon){
            return NextResponse.json({ error: "Coupon not found" }, { status: 400 })
        }
        }

             // Check if coupon is applicable for new users
        if(validatedCouponCode && coupon.forNewUser){
            const userorders = await prisma.order.findMany({where: {userId}})
            if(userorders.length > 0){
                return NextResponse.json({ error: "Coupon valid for new users" }, { status: 400 })
            }
        }

        const isPlusMember = has({plan: 'plus'})

        // Check if coupon is applicable for members
        if (validatedCouponCode && coupon.forMember){
            if(!isPlusMember){
                return NextResponse.json({ error: "Coupon valid for members only" }, { status: 400 })
            }
        }

          // Group orders by storeId using a Map
          const ordersByStore = new Map()

          for(const item of validatedItems){
            const product = await prisma.product.findUnique({where: {id: item.id}})
            const storeId = product.storeId
            if(!ordersByStore.has(storeId)){
                ordersByStore.set(storeId, [])
            }
            ordersByStore.get(storeId).push({...item, price: product.price, category: product.category})
         }

         // Fetch commission rates for all stores
         const storeIds = Array.from(ordersByStore.keys())
         const commissionRates = await prisma.commissionRate.findMany({
             where: { storeId: { in: storeIds } }
         })
         const rateMap = new Map(commissionRates.map(rate => [rate.storeId, rate.rate]))

         // Check for missing rates
         for(const storeId of storeIds){
             if(!rateMap.has(storeId)){
                 return NextResponse.json({ error: `Commission rate not found for store ${storeId}` }, { status: 400 })
             }
         }

         let orderIds = [];
         let fullAmount = 0;

         let isShippingFeeAdded = false

         // Create orders for each seller
         for(const [storeId, sellerItems] of ordersByStore.entries()){
            const rate = rateMap.get(storeId)
            let total = sellerItems.reduce((acc, item)=>acc + (item.price * item.quantity), 0)
            logger.debug('Order subtotal before adjustments', { storeId, subtotal: total })

            // Apply coupon discount first
            if(validatedCouponCode){
                const couponDiscount = (total * coupon.discount) / 100;
                total -= couponDiscount;
                logger.debug('Coupon discount applied', { storeId, couponDiscount, discountPercent: coupon.discount, totalAfterCoupon: total })
            }

            // Add shipping fee
            if(!isPlusMember && !isShippingFeeAdded){
                total += 5;
                isShippingFeeAdded = true
                logger.debug('Shipping fee added', { storeId, shippingFee: 5, totalAfterShipping: total })
            }

            // Calculate commissions per item on original item totals and deduct from adjusted total
            let totalCommission = 0
            const itemsWithCommission = sellerItems.map(item => {
                const itemTotal = item.price * item.quantity
                const categoryRate = categoryCommissionRates[item.category];
                const effectiveRate = categoryRate !== undefined ? categoryRate : (globalCommissionRate !== undefined ? globalCommissionRate : rate);
                const commission = parseFloat((itemTotal * (effectiveRate / 100)).toFixed(2))
                totalCommission += commission
                logger.debug('Item commission calculated', { storeId, itemName: item.name, commission, effectiveRate, itemTotal, category: item.category })
                return {
                    ...item,
                    commissionAmount: commission
                }
            })

            // Check if commission exceeds total (should not happen, but safety check)
            if (totalCommission > total) {
                logger.error('Commission exceeds order total', { storeId, totalCommission, total });
                return NextResponse.json({ error: "Commission calculation error" }, { status: 400 });
            }

            total -= totalCommission
            logger.debug('Order total after commission deduction', { storeId, totalAfterDeduction: total, commission: totalCommission })

            logger.debug('Final order total', { storeId, finalTotal: total })
            const roundedTotal = parseFloat(total.toFixed(2))
            fullAmount += roundedTotal
            logger.debug('Rounded total added to fullAmount', { storeId, roundedTotal, fullAmount })

            const order = await prisma.order.create({
                data: {
                    userId,
                     storeId,
                     addressId: validatedAddressId,
                     total: parseFloat(total.toFixed(2)),
                     totalCommission: parseFloat(totalCommission.toFixed(2)),
                     paymentMethod: validatedPaymentMethod,
                     currency: baseCurrency,
                     isCouponUsed: coupon ? true : false,
                     coupon: coupon ? coupon : {},
                      orderItems: {
                        create: itemsWithCommission.map(item => ({
                            productId: item.id,
                            quantity: item.quantity,
                            price: item.price,
                            currency: baseCurrency,
                            commissionAmount: item.commissionAmount
                        }))
                      }
                }
            })
            orderIds.push(order.id)
            logger.logBusinessEvent('Order Created', { orderId: order.id, storeId, userId, total: order.total, totalCommission: order.totalCommission })

            // Reserve stock for the order
            try {
                const reservationResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/store/inventory/reserve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': request.headers.get('authorization')
                    },
                    body: JSON.stringify({
                        orderId: order.id,
                        items: sellerItems.map(item => ({
                            productId: item.id,
                            quantity: item.quantity
                        }))
                    })
                })

                if (!reservationResponse.ok) {
                    const errorData = await reservationResponse.json()
                    logger.logError('Stock reservation failed', errorData, { orderId: order.id, storeId })
                    // Continue with order creation but log the error
                } else {
                    const reservationData = await reservationResponse.json()
                    if (!reservationData.success) {
                        logger.logError('Partial stock reservation', reservationData.errors, { orderId: order.id, storeId })
                    }
                }
            } catch (error) {
                logger.logError('Stock reservation error', error, { orderId: order.id, storeId })
                // Continue with order creation
            }

            // Audit logging for order creation
            await prisma.auditLog.create({
                data: {
                    userId,
                    storeId,
                    action: 'ORDER_CREATED',
                    details: {
                        orderId: order.id,
                        total: order.total,
                        totalCommission: order.totalCommission,
                        paymentMethod: validatedPaymentMethod,
                        itemCount: itemsWithCommission.length
                    }
                }
            });
         }

         if(validatedPaymentMethod === 'STRIPE'){
            const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
            const origin = await request.headers.get('origin')

            // Convert amount to USD for Stripe if necessary
            let stripeAmount = fullAmount;
            let stripeCurrency = 'usd';
            if (baseCurrency !== 'USD') {
                stripeAmount = await convertCurrency(fullAmount, baseCurrency, 'USD');
                stripeCurrency = 'usd';
            } else {
                stripeCurrency = baseCurrency.toLowerCase();
            }

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data:{
                        currency: stripeCurrency,
                        product_data:{
                            name: 'Order'
                        },
                        unit_amount: Math.round(stripeAmount * 100)
                    },
                    quantity: 1
                }],
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // current time + 30 minutes
                mode: 'payment',
                success_url: `${origin}/loading?nextUrl=orders`,
                cancel_url: `${origin}/cart`,
                metadata: {
                    orderIds: orderIds.join(','),
                    userId,
                    appId: 'DavCreations'
                }
            })
            return NextResponse.json({session})
         }

          // clear the cart
          await prisma.user.update({
            where: {id: userId},
            data: {cart : {}}
          })

          sendNotification('order', { orderIds, totalAmount: fullAmount, userId, storeIds: Array.from(ordersByStore.keys()) })

          return NextResponse.json({message: 'Orders Placed Successfully'})

    } catch (error) {
        logger.logError('Error creating orders', error, { userId });
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
});

// Get all orders for a user
export const GET = requestLogger(async (request) => {
    try {
        // Rate limiting: 30 requests per minute for order/cart operations
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const orders = await prisma.order.findMany({
            where: {userId, OR: [
                {paymentMethod: PaymentMethod.COD},
                {AND: [{paymentMethod: PaymentMethod.STRIPE}, {isPaid: true}]}
            ]},
            include: {
                orderItems: {include: {product: true}},
                address: true
            },
            orderBy: {createdAt: 'desc'}
        })

        // Decrypt sensitive address information
        const ordersWithDecryptedAddresses = orders.map(order => ({
            ...order,
            address: order.address ? decryptObject(order.address, SENSITIVE_FIELDS.ADDRESS) : order.address
        }))

        return NextResponse.json({orders: ordersWithDecryptedAddresses})
     } catch (error) {
          logger.logError('Error retrieving orders', error, { userId });
          return NextResponse.json({ error: error.message }, { status: 400 })
      }
 });
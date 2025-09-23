import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/lib/rbac";
import { rateLimit } from "@/lib/rateLimit";
import logger from "@/lib/logger";
import shippingService from "@/lib/shipping";

// Create shipment
export async function POST(request) {
    try {
        // Rate limiting: 20 requests per minute for shipment creation
        const rateLimitResponse = await rateLimit(request, 20, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { orderId, carrier, serviceType, packageDetails } = await request.json()

        // Validate required fields
        if (!orderId || !carrier) {
            return NextResponse.json({ error: 'Order ID and carrier are required' }, { status: 400 })
        }

        // RBAC check
        const rbacResult = await requirePermission(PERMISSIONS.SHIPMENT_CREATE)(request, { orderId });
        if (rbacResult.error) {
            return NextResponse.json({ error: rbacResult.error }, { status: rbacResult.status })
        }

        // Get store ID
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { store: true }
        });

        if (!user?.store) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        // Check if order belongs to store and get order details
        const order = await prisma.order.findFirst({
            where: { id: orderId, storeId: user.store.id },
            include: {
                address: true,
                store: true,
                orderItems: { include: { product: true } }
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Prepare shipment data for carrier API
        const shipmentData = {
            from: {
                name: order.store.name,
                company: order.store.name,
                address: order.store.address,
                city: 'Store City', // TODO: Add store address fields
                state: 'Store State',
                postalCode: '12345',
                country: 'US',
                email: order.store.email,
                phone: order.store.contact
            },
            to: {
                name: order.address.name,
                company: order.address.name,
                address: `${order.address.street}, ${order.address.city}`,
                city: order.address.city,
                state: order.address.state,
                postalCode: order.address.zip,
                country: order.address.country,
                email: order.address.email,
                phone: order.address.phone
            },
            packages: packageDetails || [{
                weight: 1.0, // Default weight
                length: 10,
                width: 10,
                height: 10,
                description: `Order ${orderId.slice(-8)}`
            }],
            serviceType: serviceType || 'GROUND'
        }

        // Create shipment with carrier
        let carrierResponse;
        try {
            carrierResponse = await shippingService.createShipment(carrier, shipmentData);
        } catch (carrierError) {
            console.error('Carrier API error:', carrierError);
            // Fallback: create shipment without carrier integration
            carrierResponse = {
                trackingNumber: `FALLBACK-${Date.now()}`,
                carrier: carrier,
                labelUrl: null
            }
        }

        // Create shipment record
        const shipment = await prisma.shipment.create({
            data: {
                orderId,
                carrier,
                trackingNumber: carrierResponse.trackingNumber,
                status: 'SHIPPED',
                shippedAt: new Date()
            }
        })

        // Update order status to shipped
        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'SHIPPED' }
        })

        // Audit logging
        await prisma.auditLog.create({
            data: {
                userId,
                storeId: user.store.id,
                action: 'SHIPMENT_CREATED',
                details: {
                    orderId,
                    shipmentId: shipment.id,
                    carrier,
                    trackingNumber: carrierResponse.trackingNumber
                }
            }
        });

        logger.logBusinessEvent('Shipment Created', {
            orderId,
            shipmentId: shipment.id,
            carrier,
            trackingNumber: carrierResponse.trackingNumber,
            userId
        });

        return NextResponse.json({
            message: "Shipment created successfully",
            shipment: {
                ...shipment,
                labelUrl: carrierResponse.labelUrl,
                carrierResponse
            }
        })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get shipments for store orders
export async function GET(request) {
    try {
        // Rate limiting: 30 requests per minute for shipment reads
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        // RBAC check
        const rbacResult = await requirePermission(PERMISSIONS.SHIPMENT_READ)(request);
        if (rbacResult.error) {
            return NextResponse.json({ error: rbacResult.error }, { status: rbacResult.status })
        }

        // Get store ID
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { store: true }
        });

        if (!user?.store) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const orderId = searchParams.get('orderId')

        const where = orderId ? { orderId, order: { storeId: user.store.id } } : { order: { storeId: user.store.id } }

        const shipments = await prisma.shipment.findMany({
            where,
            include: {
                order: {
                    include: {
                        user: true,
                        address: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Audit logging
        await prisma.auditLog.create({
            data: {
                userId,
                storeId: user.store.id,
                action: 'SHIPMENTS_READ',
                details: { shipmentCount: shipments.length, orderId }
            }
        });

        return NextResponse.json({ shipments })
    } catch (error) {
        logger.logError('Shipment read error', error, { userId });
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
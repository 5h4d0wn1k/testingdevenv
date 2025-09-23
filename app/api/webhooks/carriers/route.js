import crypto from 'crypto';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { NextResponse } from 'next/server';

// Webhook verification secrets from environment
const WEBHOOK_SECRETS = {
  DHL: process.env.DHL_WEBHOOK_SECRET,
  FEDEX: process.env.FEDEX_WEBHOOK_SECRET,
  BLUE_DART: process.env.BLUE_DART_WEBHOOK_SECRET
};

// Verify DHL webhook signature
function verifyDHLWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Verify FedEx webhook signature
function verifyFedExWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('base64');

  return signature === expectedSignature;
}

// Verify Blue Dart webhook (API key based)
function verifyBlueDartWebhook(apiKey, expectedKey) {
  return apiKey === expectedKey;
}

// Handle carrier webhooks
async function handleCarrierWebhook(carrier, eventType, data) {
  try {
    logger.logBusinessEvent('Carrier Webhook Received', { carrier, eventType, data });

    switch (carrier.toUpperCase()) {
      case 'DHL':
        await handleDHLWebhook(eventType, data);
        break;
      case 'FEDEX':
        await handleFedExWebhook(eventType, data);
        break;
      case 'BLUE_DART':
        await handleBlueDartWebhook(eventType, data);
        break;
      default:
        throw new Error(`Unsupported carrier: ${carrier}`);
    }

    logger.logBusinessEvent('Carrier Webhook Processed', { carrier, eventType });
  } catch (error) {
    logger.logError('Carrier Webhook Processing Error', error, { carrier, eventType, data });
    throw error;
  }
}

// Handle DHL webhook events
async function handleDHLWebhook(eventType, data) {
  const { shipmentTrackingNumber, status, timestamp } = data;

  // Find shipment by tracking number
  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber: shipmentTrackingNumber },
    include: { order: true }
  });

  if (!shipment) {
    logger.warn('DHL Webhook: Shipment not found', { trackingNumber: shipmentTrackingNumber });
    return;
  }

  // Update shipment status based on DHL status
  const statusMapping = {
    'transit': 'IN_TRANSIT',
    'delivered': 'DELIVERED',
    'exception': 'FAILED'
  };

  const newStatus = statusMapping[status.toLowerCase()] || shipment.status;

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: newStatus,
      ...(newStatus === 'DELIVERED' && { deliveredAt: new Date(timestamp) }),
      updatedAt: new Date()
    }
  });

  // Update order status if delivered
  if (newStatus === 'DELIVERED') {
    await prisma.order.update({
      where: { id: shipment.orderId },
      data: { status: 'DELIVERED' }
    });
  }
}

// Handle FedEx webhook events
async function handleFedExWebhook(eventType, data) {
  const { trackingNumber, status, timestamp } = data;

  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber },
    include: { order: true }
  });

  if (!shipment) {
    logger.warn('FedEx Webhook: Shipment not found', { trackingNumber });
    return;
  }

  const statusMapping = {
    'IN_TRANSIT': 'IN_TRANSIT',
    'DELIVERED': 'DELIVERED',
    'EXCEPTION': 'FAILED'
  };

  const newStatus = statusMapping[status] || shipment.status;

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: newStatus,
      ...(newStatus === 'DELIVERED' && { deliveredAt: new Date(timestamp) }),
      updatedAt: new Date()
    }
  });

  if (newStatus === 'DELIVERED') {
    await prisma.order.update({
      where: { id: shipment.orderId },
      data: { status: 'DELIVERED' }
    });
  }
}

// Handle Blue Dart webhook events
async function handleBlueDartWebhook(eventType, data) {
  const { awbNo, status, timestamp } = data;

  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber: awbNo },
    include: { order: true }
  });

  if (!shipment) {
    logger.warn('Blue Dart Webhook: Shipment not found', { awbNo });
    return;
  }

  const statusMapping = {
    'In Transit': 'IN_TRANSIT',
    'Delivered': 'DELIVERED',
    'Exception': 'FAILED'
  };

  const newStatus = statusMapping[status] || shipment.status;

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: newStatus,
      ...(newStatus === 'DELIVERED' && { deliveredAt: new Date(timestamp) }),
      updatedAt: new Date()
    }
  });

  if (newStatus === 'DELIVERED') {
    await prisma.order.update({
      where: { id: shipment.orderId },
      data: { status: 'DELIVERED' }
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const headers = Object.fromEntries(request.headers.entries());

    // Extract carrier from headers or body
    const carrier = headers['x-carrier'] || body.carrier;
    const eventType = headers['x-event-type'] || body.eventType;

    if (!carrier) {
      return NextResponse.json({ error: 'Carrier not specified' }, { status: 400 });
    }

    // Verify webhook authenticity
    let isValid = false;

    switch (carrier.toUpperCase()) {
      case 'DHL':
        const dhlSignature = headers['x-dhl-signature'];
        const dhlSecret = WEBHOOK_SECRETS.DHL;
        if (dhlSignature && dhlSecret) {
          isValid = verifyDHLWebhook(body, dhlSignature, dhlSecret);
        }
        break;

      case 'FEDEX':
        const fedexSignature = headers['x-fedex-signature'];
        const fedexSecret = WEBHOOK_SECRETS.FEDEX;
        if (fedexSignature && fedexSecret) {
          isValid = verifyFedExWebhook(body, fedexSignature, fedexSecret);
        }
        break;

      case 'BLUE_DART':
        const blueDartApiKey = headers['x-api-key'];
        const blueDartSecret = WEBHOOK_SECRETS.BLUE_DART;
        if (blueDartApiKey && blueDartSecret) {
          isValid = verifyBlueDartWebhook(blueDartApiKey, blueDartSecret);
        }
        break;

      default:
        return NextResponse.json({ error: 'Unsupported carrier' }, { status: 400 });
    }

    if (!isValid) {
      logger.warn('Invalid webhook signature', { carrier, headers: Object.keys(headers) });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Process the webhook
    await handleCarrierWebhook(carrier, eventType, body);

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.logError('Webhook processing error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
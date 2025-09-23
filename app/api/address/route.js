import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { addressSchema } from "@/lib/validations";
import { encryptObject, decryptObject, SENSITIVE_FIELDS } from "@/lib/encryption";
import { rateLimit } from "@/lib/rateLimit";
import { sanitizeObject, SANITIZATION_SCHEMAS } from "@/lib/sanitization";
import logger from "@/lib/logger";

// Add new address
export async function POST(request){
    try {
        // Rate limiting: 10 requests per minute for address creation
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const { address } = await request.json()

        // Sanitize input before validation
        const sanitizedAddress = sanitizeObject(address, SANITIZATION_SCHEMAS.ADDRESS)

        const validation = addressSchema.safeParse(sanitizedAddress)
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        // Encrypt sensitive fields before storing
        const validatedAddress = encryptObject({ ...validation.data, userId }, SENSITIVE_FIELDS.ADDRESS)

        const newAddress = await prisma.address.create({
            data: validatedAddress
        })

        // Return decrypted version for response
        const decryptedAddress = decryptObject(newAddress, SENSITIVE_FIELDS.ADDRESS)

        logger.logBusinessEvent('Address Created', { addressId: newAddress.id, userId });

        return NextResponse.json({newAddress: decryptedAddress, message: 'Address added successfully' })
    } catch (error) {
        logger.logError('Address creation error', error, { userId });
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get all addresses for a user
export async function GET(request){
    try {
        // Rate limiting: 30 requests per minute for address reads
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const addresses = await prisma.address.findMany({
            where: { userId }
        })

        // Decrypt sensitive fields for each address
        const decryptedAddresses = addresses.map(address =>
            decryptObject(address, SENSITIVE_FIELDS.ADDRESS)
        )

        return NextResponse.json({addresses: decryptedAddresses})
    } catch (error) {
        logger.logError('Address retrieval error', error, { userId });
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Update address
export async function PUT(request) {
    try {
        // Rate limiting: 10 requests per minute
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { addressId, address } = await request.json();

        if (!addressId || !address) {
            return NextResponse.json({ error: 'Address ID and address data are required' }, { status: 400 });
        }

        // Sanitize input
        const sanitizedAddress = sanitizeObject(address, SANITIZATION_SCHEMAS.ADDRESS);

        const validation = addressSchema.safeParse(sanitizedAddress);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
        }

        // Check if address belongs to user
        const existingAddress = await prisma.address.findFirst({
            where: { id: addressId, userId }
        });

        if (!existingAddress) {
            return NextResponse.json({ error: 'Address not found' }, { status: 404 });
        }

        // Encrypt sensitive fields
        const encryptedAddress = encryptObject({ ...validation.data, userId }, SENSITIVE_FIELDS.ADDRESS);

        const updatedAddress = await prisma.address.update({
            where: { id: addressId },
            data: encryptedAddress
        });

        // Return decrypted version
        const decryptedAddress = decryptObject(updatedAddress, SENSITIVE_FIELDS.ADDRESS);

        logger.logBusinessEvent('Address updated', { addressId, userId });

        return NextResponse.json({ address: decryptedAddress, message: 'Address updated successfully' });
    } catch (error) {
        logger.logError('Address update error', error, { userId });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Delete address
export async function DELETE(request) {
    try {
        // Rate limiting: 10 requests per minute
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const addressId = searchParams.get('id');

        if (!addressId) {
            return NextResponse.json({ error: 'Address ID is required' }, { status: 400 });
        }

        // Check if address belongs to user and is not used in any orders
        const address = await prisma.address.findFirst({
            where: { id: addressId, userId },
            include: { Order: true }
        });

        if (!address) {
            return NextResponse.json({ error: 'Address not found' }, { status: 404 });
        }

        if (address.Order.length > 0) {
            return NextResponse.json({ error: 'Cannot delete address that is used in orders' }, { status: 400 });
        }

        await prisma.address.delete({
            where: { id: addressId }
        });

        logger.logBusinessEvent('Address deleted', { addressId, userId });

        return NextResponse.json({ message: 'Address deleted successfully' });
    } catch (error) {
        logger.logError('Address deletion error', error, { userId });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
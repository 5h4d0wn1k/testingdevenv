import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { storeDataQuerySchema } from "@/lib/validations";

// Get store info & store products
export async function GET(request){
    try {
        // Get store username from query params
        const { searchParams } = new URL(request.url)
        const username = searchParams.get('username')

        const validation = storeDataQuerySchema.safeParse({username})
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const validatedUsername = validation.data.username.toLowerCase();

        // Get store info and inStock products with ratings
        const store = await prisma.store.findUnique({
            where: {username: validatedUsername, isActive: true},
            include: {
                Product: {include: {rating: true}},
                vendorProfile: true
            }
        })

        if(!store){
            return NextResponse.json({error: "store not found"}, { status: 400 })
        }

        return NextResponse.json({store})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
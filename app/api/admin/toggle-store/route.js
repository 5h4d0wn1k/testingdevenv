import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { toggleStoreSchema } from "@/lib/validations";

// Toggle Store isActive
export async function POST(request){
    try {
        const { userId } = getAuth(request)
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const {storeId} = await request.json()

        const validation = toggleStoreSchema.safeParse({storeId})
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const {storeId: validatedStoreId} = validation.data

        // Find the store
        const store = await prisma.store.findUnique({where: {id: validatedStoreId}})

        if(!store){
           return NextResponse.json({ error: "store not found" }, { status: 400 }); 
        }

        await prisma.store.update({
            where: { id: validatedStoreId },
            data: { isActive: !store.isActive }
        })

        return NextResponse.json({message: "Store updated successfully"})

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
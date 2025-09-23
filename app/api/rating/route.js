import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ratingSchema } from "@/lib/validations";


// Add new rating
export async function POST(request){
    try {
        const { userId } = getAuth(request)
        const {orderId, productId, rating, review} = await request.json()

        const validation = ratingSchema.safeParse({orderId, productId, rating, review})
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const {orderId: validatedOrderId, productId: validatedProductId, rating: validatedRating, review: validatedReview} = validation.data

        const order = await prisma.order.findUnique({where: {id: validatedOrderId, userId}})

        if(!order){
            return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }

         const isAlreadyRated = await prisma.rating.findFirst({where: {productId: validatedProductId, orderId: validatedOrderId}})

         if(isAlreadyRated){
            return NextResponse.json({ error: "Product already rated" }, { status: 400 })
         }

         const response = await prisma.rating.create({
            data: {userId, productId: validatedProductId, rating: validatedRating, review: validatedReview, orderId: validatedOrderId}
         })

         return NextResponse.json({message: "Rating added successfully", rating: response})

      
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, { status: 400 })
    }
}

// Get all ratings for a user
export async function GET(request){
    try {
        const {userId} = getAuth(request)
        if(!userId){
            return NextResponse.json({error: "Unauthorized"}, { status: 401 })
        }
        const ratings = await prisma.rating.findMany({
            where: {userId}
        })

        return NextResponse.json({ratings})
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, { status: 400 })
    }
}
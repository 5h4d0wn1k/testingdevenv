import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


// Get Dashboard Data for Seller ( total orders, total earnings, total products )
export async function GET(request){
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        // Get store info for status
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { vendorStatus: true }
        })

        // Get all orders for seller with orderItems
        const orders = await prisma.order.findMany({
            where: {storeId},
            include: {orderItems: true}
        })

         // Get all products with ratings for seller
         const products = await prisma.product.findMany({where: {storeId}})

         const ratings = await prisma.rating.findMany({
            where: {productId: {in: products.map(product => product.id)}},
            include: {user: true, product: true}
         })

         // Calculate gross earnings: sum of (price * quantity) for all orderItems
         const grossEarnings = orders.reduce((acc, order) =>
             acc + order.orderItems.reduce((itemAcc, item) => itemAcc + (item.price * item.quantity), 0), 0
         )

         // Calculate total commissions: sum of totalCommission for all orders
         const totalCommissions = orders.reduce((acc, order) => acc + order.totalCommission, 0)

         // Calculate net earnings: gross - total commissions
         const netEarnings = grossEarnings - totalCommissions

         // Calculate total commissions paid: sum of totalCommission where commissionPaid is true
         const totalCommissionsPaid = orders
             .filter(order => order.commissionPaid)
             .reduce((acc, order) => acc + order.totalCommission, 0)

         // Detailed breakdowns: list of orders with commission details
         const commissionBreakdowns = orders.map(order => ({
             orderId: order.id,
             total: order.total,
             totalCommission: order.totalCommission,
             commissionPaid: order.commissionPaid,
             createdAt: order.createdAt
         }))

         console.log(`Gross earnings for store ${storeId}: ${grossEarnings}`)
         console.log(`Total commissions for store ${storeId}: ${totalCommissions}`)
         console.log(`Net earnings for store ${storeId}: ${netEarnings}`)
         console.log(`Total commissions paid for store ${storeId}: ${totalCommissionsPaid}`)

         const dashboardData = {
            ratings,
            totalOrders: orders.length,
            grossEarnings: Math.round(grossEarnings),
            netEarnings: Math.round(netEarnings),
            totalCommissions: Math.round(totalCommissions),
            totalCommissionsPaid: Math.round(totalCommissionsPaid),
            commissionBreakdowns,
            totalProducts: products.length,
            vendorStatus: store.vendorStatus
         }

         return NextResponse.json({ dashboardData });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
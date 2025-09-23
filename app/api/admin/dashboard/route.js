import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

// Get Dashboard Data for Admin ( total orders, total stores, total products, total revenue )

export async function GET(request){

    try {
        // Rate limiting: 60 requests per minute for admin operations
        const rateLimitResponse = await rateLimit(request, 60, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)

     if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

    // Get total vendors (stores)
    const totalVendors = await prisma.store.count()
    // Get active products (in stock)
    const activeProducts = await prisma.product.count({ where: { inStock: true } })
    // Get pending orders (status ORDER_PLACED)
    const pendingOrders = await prisma.order.count({ where: { status: 'ORDER_PLACED' } })

    // Get monthly GMV (current month)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthlyGMVResult = await prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: startOfMonth } }
    })
    const monthlyGMV = (monthlyGMVResult._sum.total || 0).toFixed(2)

    // Get all orders for sales chart
    const allOrders = await prisma.order.findMany({
        select: {
            createdAt: true,
            total: true,
            storeId: true
        }
    })

    // Get vendor performance: sales per store
    const vendorSales = await prisma.order.groupBy({
        by: ['storeId'],
        _sum: { total: true }
    })

    // Get store names
    const storeIds = vendorSales.map(v => v.storeId)
    const stores = await prisma.store.findMany({
        where: { id: { in: storeIds } },
        select: { id: true, name: true }
    })
    const storeMap = stores.reduce((acc, s) => { acc[s.id] = s.name; return acc }, {})

    const vendorPerformance = vendorSales.map(v => ({
        storeName: storeMap[v.storeId] || 'Unknown',
        sales: v._sum.total || 0
    }))

    // Calculate total revenue for legacy, but not needed
    let totalRevenue = 0
    allOrders.forEach(order => {
        totalRevenue += order.total
    })
    const revenue = totalRevenue.toFixed(2)

    // Calculate commission metrics
    const allOrdersWithCommission = await prisma.order.findMany({
        select: {
            totalCommission: true,
            commissionPaid: true
        }
    })

    let totalCommissions = 0
    let paidCommissions = 0

    allOrdersWithCommission.forEach(order => {
        totalCommissions += order.totalCommission
        if (order.commissionPaid) {
            paidCommissions += order.totalCommission
        }
    })

    console.log(`[COMMISSION_DEBUG] Dashboard metrics:`)
    console.log(`[COMMISSION_DEBUG] - Total Revenue: $${revenue}`)
    console.log(`[COMMISSION_DEBUG] - Total Commissions Collected: $${totalCommissions.toFixed(2)}`)
    console.log(`[COMMISSION_DEBUG] - Commissions Paid: $${paidCommissions.toFixed(2)}`)
    console.log(`[COMMISSION_DEBUG] - Pending Commissions: $${(totalCommissions - paidCommissions).toFixed(2)}`)
    const dashboardData = {
        totalVendors,
        activeProducts,
        pendingOrders,
        monthlyGMV,
        allOrders,
        vendorPerformance,
        // Commission data
        totalCommissions,
        paidCommissions,
        pendingCommissions: totalCommissions - paidCommissions,
        // Legacy fields for compatibility
        orders: allOrders.length,
        stores: totalVendors,
        products: activeProducts,
        revenue
    }

    return NextResponse.json({dashboardData})

    } catch (error) {
         console.error(error);
         return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
    

}
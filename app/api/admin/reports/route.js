import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request) {
    try {
        // Rate limiting: 30 requests per minute for reports
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const body = await request.json();
        const { metrics, dateRange, storeId } = body;

        // Validation
        if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
            return NextResponse.json({ error: 'metrics must be a non-empty array' }, { status: 400 });
        }

        const validMetrics = ['sales', 'returns', 'vendor_performance'];
        if (!metrics.every(m => validMetrics.includes(m))) {
            return NextResponse.json({ error: 'invalid metrics' }, { status: 400 });
        }

        if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
            return NextResponse.json({ error: 'dateRange with startDate and endDate required' }, { status: 400 });
        }

        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json({ error: 'invalid dates' }, { status: 400 });
        }

        const whereClause = {
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        };
        if (storeId) {
            whereClause.storeId = storeId;
        }

        const result = {};

        // Sales: Aggregate Order.total by date/store
        if (metrics.includes('sales')) {
            const salesData = await prisma.order.groupBy({
                by: ['storeId'],
                _sum: { total: true },
                where: whereClause,
                orderBy: { _sum: { total: 'desc' } }
            });

            // Get store names
            const storeIds = salesData.map(s => s.storeId);
            const stores = await prisma.store.findMany({
                where: { id: { in: storeIds } },
                select: { id: true, name: true }
            });
            const storeMap = stores.reduce((acc, s) => { acc[s.id] = s.name; return acc; }, {});

            result.sales = salesData.map(s => ({
                storeId: s.storeId,
                storeName: storeMap[s.storeId] || 'Unknown',
                total: s._sum.total || 0
            }));
        }

        // Returns: Count Return records by date/store
        if (metrics.includes('returns')) {
            const returnsData = await prisma.return.groupBy({
                by: ['orderId'],
                where: {
                    requestedAt: {
                        gte: startDate,
                        lte: endDate
                    },
                    order: storeId ? { storeId } : undefined
                },
                _count: { id: true }
            });

            // Group by store
            const storeReturns = {};
            for (const ret of returnsData) {
                const order = await prisma.order.findUnique({
                    where: { id: ret.orderId },
                    select: { storeId: true }
                });
                if (order) {
                    storeReturns[order.storeId] = (storeReturns[order.storeId] || 0) + ret._count.id;
                }
            }

            // Get store names
            const storeIds = Object.keys(storeReturns);
            const stores = await prisma.store.findMany({
                where: { id: { in: storeIds } },
                select: { id: true, name: true }
            });
            const storeMap = stores.reduce((acc, s) => { acc[s.id] = s.name; return acc; }, {});

            result.returns = Object.entries(storeReturns).map(([storeId, count]) => ({
                storeId,
                storeName: storeMap[storeId] || 'Unknown',
                count
            }));
        }

        // Vendor performance: Use DailyFinancialSummary
        if (metrics.includes('vendor_performance')) {
            const perfWhere = {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            };
            if (storeId) {
                perfWhere.storeId = storeId;
            }

            const perfData = await prisma.dailyFinancialSummary.findMany({
                where: perfWhere,
                select: {
                    storeId: true,
                    date: true,
                    totalSales: true,
                    orderCount: true,
                    averageOrderValue: true,
                    unitsSold: true,
                    grossRevenue: true,
                    netRevenue: true,
                    totalCommissions: true,
                    totalRefunds: true,
                    totalReturns: true
                },
                orderBy: { date: 'asc' }
            });

            // Group by store
            const storePerf = {};
            perfData.forEach(p => {
                if (!storePerf[p.storeId]) {
                    storePerf[p.storeId] = [];
                }
                storePerf[p.storeId].push({
                    date: p.date.toISOString().split('T')[0],
                    totalSales: p.totalSales,
                    orderCount: p.orderCount,
                    averageOrderValue: p.averageOrderValue,
                    unitsSold: p.unitsSold,
                    grossRevenue: p.grossRevenue,
                    netRevenue: p.netRevenue,
                    totalCommissions: p.totalCommissions,
                    totalRefunds: p.totalRefunds,
                    totalReturns: p.totalReturns
                });
            });

            // Get store names
            const storeIds = Object.keys(storePerf);
            const stores = await prisma.store.findMany({
                where: { id: { in: storeIds } },
                select: { id: true, name: true }
            });
            const storeMap = stores.reduce((acc, s) => { acc[s.id] = s.name; return acc; }, {});

            result.vendor_performance = Object.entries(storePerf).map(([storeId, data]) => ({
                storeId,
                storeName: storeMap[storeId] || 'Unknown',
                data
            }));
        }

        return NextResponse.json({ data: result });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
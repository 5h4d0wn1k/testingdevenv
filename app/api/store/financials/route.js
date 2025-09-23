import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/lib/rbac";
import { rateLimit } from "@/lib/rateLimit";
import logger from "@/lib/logger";

export async function GET(request) {
    try {
        // Rate limiting: 30 requests per minute for financial data
        const rateLimitResponse = await rateLimit(request, 30, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        // RBAC check
        const rbacResult = await requirePermission(PERMISSIONS.FINANCIAL_READ)(request);
        if (rbacResult.error) {
            return NextResponse.json({ error: rbacResult.error }, { status: rbacResult.status });
        }

        // Get store ID
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { store: true }
        });

        if (!user?.store) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const dateRange = searchParams.get('dateRange') || '30d';
        const product = searchParams.get('product');
        const category = searchParams.get('category');

        // Calculate date range
        const now = new Date();
        let startDate;
        switch (dateRange) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default: // 30d
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const storeId = user.store.id;

        // Get orders within date range
        const orders = await prisma.order.findMany({
            where: {
                storeId,
                createdAt: {
                    gte: startDate,
                    lte: now
                },
                status: {
                    in: ['DELIVERED', 'PROCESSING', 'SHIPPED']
                }
            },
            include: {
                orderItems: {
                    include: { product: true }
                }
            }
        });

        // Calculate dashboard metrics
        const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
        const orderCount = orders.length;
        const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;
        const unitsSold = orders.reduce((sum, order) =>
            sum + order.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
        );

        // Get commission data
        const commissionRate = await prisma.commissionRate.findUnique({
            where: { storeId }
        });

        const totalCommission = orders.reduce((sum, order) => sum + order.totalCommission, 0);
        const netRevenue = totalSales - totalCommission;

        // Get payout data
        const payouts = await prisma.payout.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const pendingPayouts = payouts.filter(p => p.status === 'PENDING');
        const pendingAmount = pendingPayouts.reduce((sum, payout) => sum + payout.amount, 0);

        // Calculate next payout date (simplified - every 15th and last day of month)
        const nextPayoutDate = new Date();
        if (nextPayoutDate.getDate() < 15) {
            nextPayoutDate.setDate(15);
        } else {
            nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1, 1);
        }

        // Get tax data (simplified)
        const taxRecords = await prisma.taxRecord.findMany({
            where: {
                storeId,
                startDate: { gte: startDate },
                endDate: { lte: now }
            }
        });

        // Get daily summaries
        const dailySummaries = await prisma.dailyFinancialSummary.findMany({
            where: {
                storeId,
                date: {
                    gte: startDate,
                    lte: now
                }
            },
            orderBy: { date: 'desc' },
            include: {
                commissionBreakdowns: true
            }
        });

        // Prepare response data
        const responseData = {
            dashboard: {
                totalSales,
                averageOrderValue,
                unitsSold,
                orderCount,
                salesTrend: 0, // Would calculate from previous period
                aovTrend: 0,
                unitsTrend: 0,
                ordersTrend: 0,
                dailyData: dailySummaries.map(day => ({
                    date: day.date.toISOString().split('T')[0],
                    sales: day.totalSales,
                    orders: day.orderCount,
                    aov: day.averageOrderValue
                }))
            },
            commissions: {
                grossRevenue: totalSales,
                totalCommission,
                netRevenue,
                commissionRate: commissionRate?.rate || 0,
                breakdown: dailySummaries.flatMap(day =>
                    day.commissionBreakdowns.map(breakdown => ({
                        type: breakdown.commissionType,
                        description: `${breakdown.commissionType} commission`,
                        amount: breakdown.commissionAmount,
                        rate: breakdown.commissionRate
                    }))
                )
            },
            payouts: {
                nextPayout: {
                    amount: pendingAmount,
                    date: nextPayoutDate.toISOString().split('T')[0]
                },
                pendingAmount,
                history: payouts.map(payout => ({
                    id: payout.id,
                    amount: payout.amount,
                    status: payout.status,
                    date: payout.payoutDate || payout.createdAt
                }))
            },
            taxes: {
                totalTaxable: taxRecords.reduce((sum, record) => sum + record.taxableAmount, 0),
                totalTax: taxRecords.reduce((sum, record) => sum + record.taxAmount, 0),
                filingStatus: 'Up to date',
                regions: taxRecords.reduce((acc, record) => {
                    const existing = acc.find(r => r.name === record.region);
                    if (existing) {
                        existing.taxableAmount += record.taxableAmount;
                        existing.taxAmount += record.taxAmount;
                    } else {
                        acc.push({
                            name: record.region,
                            rate: record.taxRate,
                            taxableAmount: record.taxableAmount,
                            taxAmount: record.taxAmount
                        });
                    }
                    return acc;
                }, [])
            }
        };

        // Audit logging
        await prisma.auditLog.create({
            data: {
                userId,
                storeId,
                action: 'FINANCIALS_READ',
                details: { dateRange, filters: { product, category } }
            }
        });

        return NextResponse.json(responseData);
    } catch (error) {
        logger.logError('Financial data read error', error, { userId });
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
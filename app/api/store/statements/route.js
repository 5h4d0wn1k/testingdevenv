import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/lib/rbac";
import { rateLimit } from "@/lib/rateLimit";
import logger from "@/lib/logger";

function generateCSV(data, headers) {
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header.toLowerCase().replace(/\s+/g, '')];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
        });
        csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
}

export async function GET(request) {
    try {
        // Rate limiting: 10 requests per minute for statement downloads
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        // RBAC check
        const rbacResult = await requirePermission(PERMISSIONS.STATEMENT_READ)(request);
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
        const type = searchParams.get('type'); // 'sales', 'commissions'
        const period = searchParams.get('period'); // '30d', '90d', '1y', 'month', 'last_month'

        if (!type || !period) {
            return NextResponse.json({ error: 'Type and period parameters are required' }, { status: 400 });
        }

        const storeId = user.store.id;

        // Calculate date range
        const now = new Date();
        let startDate, endDate = now;

        switch (period) {
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            default:
                return NextResponse.json({ error: 'Invalid period parameter' }, { status: 400 });
        }

        let csvData, headers, filename;

        if (type === 'sales') {
            // Get sales data
            const orders = await prisma.order.findMany({
                where: {
                    storeId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                include: {
                    orderItems: {
                        include: { product: true }
                    },
                    user: true
                },
                orderBy: { createdAt: 'desc' }
            });

            headers = ['Order ID', 'Date', 'Customer', 'Items', 'Total Amount', 'Commission', 'Net Amount', 'Status'];
            csvData = orders.map(order => ({
                'Order ID': order.id.slice(-8),
                'Date': order.createdAt.toISOString().split('T')[0],
                'Customer': order.user?.name || 'N/A',
                'Items': order.orderItems.length,
                'Total Amount': order.total.toFixed(2),
                'Commission': order.totalCommission.toFixed(2),
                'Net Amount': (order.total - order.totalCommission).toFixed(2),
                'Status': order.status
            }));

            filename = `sales_statement_${period}_${new Date().toISOString().split('T')[0]}.csv`;

        } else if (type === 'commissions') {
            // Get commission data
            const orders = await prisma.order.findMany({
                where: {
                    storeId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    },
                    commissionPaid: false
                },
                include: {
                    orderItems: {
                        include: { product: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Get commission breakdowns
            const commissionBreakdowns = await prisma.commissionBreakdown.findMany({
                where: {
                    dailySummary: {
                        storeId,
                        date: {
                            gte: startDate,
                            lte: endDate
                        }
                    }
                },
                include: {
                    dailySummary: true
                }
            });

            headers = ['Date', 'Order ID', 'Commission Type', 'Base Amount', 'Commission Rate', 'Commission Amount'];
            csvData = commissionBreakdowns.map(breakdown => ({
                'Date': breakdown.dailySummary.date.toISOString().split('T')[0],
                'Order ID': breakdown.orderId?.slice(-8) || 'N/A',
                'Commission Type': breakdown.commissionType,
                'Base Amount': breakdown.baseAmount.toFixed(2),
                'Commission Rate': `${breakdown.commissionRate}%`,
                'Commission Amount': breakdown.commissionAmount.toFixed(2)
            }));

            filename = `commission_statement_${period}_${new Date().toISOString().split('T')[0]}.csv`;

        } else {
            return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
        }

        const csvContent = generateCSV(csvData, headers);

        // Audit logging
        await prisma.auditLog.create({
            data: {
                userId,
                storeId,
                action: 'STATEMENT_DOWNLOADED',
                details: { type, period, recordCount: csvData.length }
            }
        });

        // Return CSV file
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (error) {
        logger.logError('Statement download error', error, { userId });
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
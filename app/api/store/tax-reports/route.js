import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/lib/rbac";
import { rateLimit } from "@/lib/rateLimit";
import logger from "@/lib/logger";

export async function GET(request) {
    try {
        // Rate limiting: 20 requests per minute for tax reports
        const rateLimitResponse = await rateLimit(request, 20, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        // RBAC check
        const rbacResult = await requirePermission(PERMISSIONS.TAX_READ)(request);
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
        const period = searchParams.get('period') || 'monthly'; // monthly, quarterly, yearly
        const region = searchParams.get('region');

        const storeId = user.store.id;

        // Calculate date ranges based on period
        const now = new Date();
        let startDate, endDate = now;
        let groupByFormat;

        switch (period) {
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                groupByFormat = 'month';
                break;
            case 'quarterly':
                const quarterStart = Math.floor(now.getMonth() / 3) * 3;
                startDate = new Date(now.getFullYear(), quarterStart, 1);
                groupByFormat = 'quarter';
                break;
            case 'yearly':
                startDate = new Date(now.getFullYear(), 0, 1);
                groupByFormat = 'year';
                break;
            default:
                return NextResponse.json({ error: 'Invalid period parameter' }, { status: 400 });
        }

        // Get tax records
        const taxRecords = await prisma.taxRecord.findMany({
            where: {
                storeId,
                startDate: { gte: startDate },
                endDate: { lte: endDate },
                ...(region && { region })
            },
            orderBy: { startDate: 'desc' }
        });

        // Get orders for tax calculation (fallback if no tax records exist)
        const orders = await prisma.order.findMany({
            where: {
                storeId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                },
                status: {
                    in: ['DELIVERED', 'PROCESSING', 'SHIPPED']
                }
            },
            include: {
                address: true
            }
        });

        // Group tax data by region
        const taxByRegion = {};

        // Process existing tax records
        taxRecords.forEach(record => {
            if (!taxByRegion[record.region]) {
                taxByRegion[record.region] = {
                    region: record.region,
                    taxType: record.taxType,
                    taxRate: record.taxRate,
                    taxableAmount: 0,
                    taxAmount: 0,
                    orderCount: 0
                };
            }
            taxByRegion[record.region].taxableAmount += record.taxableAmount;
            taxByRegion[record.region].taxAmount += record.taxAmount;
        });

        // If no tax records exist, calculate from orders
        if (Object.keys(taxByRegion).length === 0) {
            orders.forEach(order => {
                const region = order.address?.country || 'Unknown';
                if (!taxByRegion[region]) {
                    // Default tax rates (this should be configurable)
                    const defaultRates = {
                        'US': { rate: 8.25, type: 'Sales Tax' },
                        'CA': { rate: 13.0, type: 'GST/HST' },
                        'GB': { rate: 20.0, type: 'VAT' },
                        'AU': { rate: 10.0, type: 'GST' }
                    };

                    const taxInfo = defaultRates[region] || { rate: 0, type: 'Tax' };

                    taxByRegion[region] = {
                        region,
                        taxType: taxInfo.type,
                        taxRate: taxInfo.rate,
                        taxableAmount: 0,
                        taxAmount: 0,
                        orderCount: 0
                    };
                }

                taxByRegion[region].taxableAmount += order.total;
                taxByRegion[region].taxAmount += (order.total * taxByRegion[region].taxRate) / 100;
                taxByRegion[region].orderCount += 1;
            });
        }

        // Calculate summary
        const regions = Object.values(taxByRegion);
        const totalTaxable = regions.reduce((sum, region) => sum + region.taxableAmount, 0);
        const totalTax = regions.reduce((sum, region) => sum + region.taxAmount, 0);
        const totalOrders = regions.reduce((sum, region) => sum + region.orderCount, 0);

        const responseData = {
            summary: {
                period,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                totalTaxable,
                totalTax,
                totalOrders,
                regionsCount: regions.length
            },
            regions: regions.map(region => ({
                ...region,
                taxableAmount: region.taxableAmount.toFixed(2),
                taxAmount: region.taxAmount.toFixed(2)
            })),
            records: taxRecords.map(record => ({
                id: record.id,
                period: record.period,
                startDate: record.startDate.toISOString().split('T')[0],
                endDate: record.endDate.toISOString().split('T')[0],
                taxType: record.taxType,
                region: record.region,
                taxRate: record.taxRate,
                taxableAmount: record.taxableAmount.toFixed(2),
                taxAmount: record.taxAmount.toFixed(2),
                status: record.status,
                filedAt: record.filedAt?.toISOString().split('T')[0]
            }))
        };

        // Audit logging
        await prisma.auditLog.create({
            data: {
                userId,
                storeId,
                action: 'TAX_REPORTS_READ',
                details: { period, region, recordCount: taxRecords.length }
            }
        });

        return NextResponse.json(responseData);
    } catch (error) {
        logger.logError('Tax report read error', error, { userId });
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

// POST - Create or update tax records
export async function POST(request) {
    try {
        // Rate limiting: 5 requests per minute for tax record creation
        const rateLimitResponse = await rateLimit(request, 5, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 });
        }

        // RBAC check
        const rbacResult = await requirePermission(PERMISSIONS.TAX_CREATE)(request);
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

        const { period, startDate, endDate, region, taxType, taxRate } = await request.json();

        if (!period || !startDate || !endDate || !region || !taxType || taxRate === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const storeId = user.store.id;

        // Calculate tax amounts from orders in the period
        const orders = await prisma.order.findMany({
            where: {
                storeId,
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                },
                address: {
                    country: region
                },
                status: {
                    in: ['DELIVERED', 'PROCESSING', 'SHIPPED']
                }
            }
        });

        const taxableAmount = orders.reduce((sum, order) => sum + order.total, 0);
        const taxAmount = (taxableAmount * taxRate) / 100;

        // Create tax record
        const taxRecord = await prisma.taxRecord.create({
            data: {
                storeId,
                period,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                taxType,
                region,
                taxRate,
                taxableAmount,
                taxAmount,
                status: 'pending'
            }
        });

        // Audit logging
        await prisma.auditLog.create({
            data: {
                userId,
                storeId,
                action: 'TAX_RECORD_CREATED',
                details: { taxRecordId: taxRecord.id, region, period, taxAmount }
            }
        });

        return NextResponse.json({
            message: 'Tax record created successfully',
            taxRecord: {
                id: taxRecord.id,
                period: taxRecord.period,
                region: taxRecord.region,
                taxableAmount: taxRecord.taxableAmount.toFixed(2),
                taxAmount: taxRecord.taxAmount.toFixed(2),
                status: taxRecord.status
            }
        });
    } catch (error) {
        logger.logError('Tax record creation error', error, { userId });
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}
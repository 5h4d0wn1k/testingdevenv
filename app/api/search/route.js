import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { PricingEngine } from "@/lib/pricingEngine";
import { searchQuerySchema } from "@/lib/validations";
import logger from "@/lib/logger";
import {
    expandWithSynonyms,
    buildFullTextQuery,
    buildSimilarityQuery,
    combineSearchQueries,
    detectTypos,
    generateSuggestions,
    logSearchQuery,
    calculateRelevanceScore
} from "@/lib/search";

export async function GET(request) {
    const startTime = Date.now();
    try {
        // Rate limiting: 200 requests per minute for search operations
        const rateLimitResponse = await rateLimit(request, 200, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { searchParams } = new URL(request.url);

        // Parse query parameters
        const queryData = {
            q: searchParams.get('q') || undefined,
            category: searchParams.get('category') || undefined,
            brand: searchParams.get('brand') || undefined,
            minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')) : undefined,
            maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')) : undefined,
            rating: searchParams.get('rating') ? parseInt(searchParams.get('rating')) : undefined,
            store: searchParams.get('store') || undefined,
            page: searchParams.get('page') ? parseInt(searchParams.get('page')) : 1,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 20,
            sort: searchParams.get('sort') || 'newest',
        };

        // Validate query parameters
        const validationResult = searchQuerySchema.safeParse(queryData);
        if (!validationResult.success) {
            logger.logError('Search validation failed', new Error('Invalid query parameters'), {
                errors: validationResult.error.errors,
                queryData
            });
            return NextResponse.json({
                error: "Invalid query parameters",
                details: validationResult.error.errors
            }, { status: 400 });
        }

        const params = validationResult.data;

        // Enhanced search: typo detection and suggestions
        let correctedQuery = params.q;
        let suggestions = [];
        let hasTypos = false;

        if (params.q) {
            try {
                // Detect typos and get corrections
                const typoResult = await detectTypos(params.q);
                correctedQuery = typoResult.correctedQuery;
                hasTypos = typoResult.hasTypos;

                // Generate search suggestions
                suggestions = await generateSuggestions(correctedQuery || params.q);

                // Add typo suggestions if typos were detected
                if (hasTypos && typoResult.suggestions) {
                    suggestions = [...suggestions, ...typoResult.suggestions];
                }

                // Remove duplicates and limit suggestions
                suggestions = [...new Set(suggestions)].slice(0, 10);

            } catch (error) {
                logger.logError('Error in typo detection/suggestions', error, { query: params.q });
                // Continue with original query
                correctedQuery = params.q;
                suggestions = [];
                hasTypos = false;
            }
        }

        // Build where clause
        let where = {
            inStock: true,
            status: 'ACTIVE',
            moderationStatus: 'APPROVED',
            store: {
                isActive: true,
                vendorStatus: 'APPROVED'
            }
        };

        // Category filter
        if (params.category) {
            where.categoryId = params.category;
        }

        // Brand filter (from attributes)
        if (params.brand) {
            where.attributes = {
                path: ['brand'],
                equals: params.brand
            };
        }

        // Price range filter
        if (params.minPrice !== undefined || params.maxPrice !== undefined) {
            where.price = {};
            if (params.minPrice !== undefined) {
                where.price.gte = params.minPrice;
            }
            if (params.maxPrice !== undefined) {
                where.price.lte = params.maxPrice;
            }
        }

        // Store filter
        if (params.store) {
            where.store = {
                ...where.store,
                username: params.store
            };
        }

        // Enhanced keyword search with multiple strategies
        let useRawSqlSearch = false;
        let searchQueryString = '';

        if (correctedQuery) {
            try {
                // Expand query with synonyms for broader matching
                const synonyms = await expandWithSynonyms(correctedQuery);
                const allTerms = [correctedQuery, ...synonyms].filter(term => term.length > 0);

                if (allTerms.length > 0) {
                    // Create full-text search query string
                    searchQueryString = allTerms.map(term => term.replace(/'/g, "''")).join(' | ');
                    useRawSqlSearch = true;
                }
            } catch (error) {
                logger.logError('Error in enhanced search setup', error, { query: correctedQuery });
                // Fallback to basic search
                where.OR = [
                    { name: { contains: correctedQuery, mode: 'insensitive' } },
                    { description: { contains: correctedQuery, mode: 'insensitive' } },
                    { tags: { has: correctedQuery } },
                    { category: { contains: correctedQuery, mode: 'insensitive' } },
                    { subcategory: { contains: correctedQuery, mode: 'insensitive' } }
                ];
            }
        }

        // Rating filter - we'll handle this after fetching products
        let minAvgRating = params.rating;

        // Build orderBy
        let orderBy = {};
        let sortByRelevance = false;
        switch (params.sort) {
            case 'price_asc':
                orderBy = { price: 'asc' };
                break;
            case 'price_desc':
                orderBy = { price: 'desc' };
                break;
            case 'newest':
                orderBy = { createdAt: 'desc' };
                break;
            case 'rating':
                // Will sort by average rating after fetching
                orderBy = { createdAt: 'desc' }; // fallback
                break;
            case 'popularity':
                // Will sort by rating count after fetching
                orderBy = { createdAt: 'desc' }; // fallback
                break;
            case 'relevance':
                sortByRelevance = true;
                orderBy = { createdAt: 'desc' }; // fallback for database ordering
                break;
            default:
                // Default to relevance if there's a search query, otherwise newest
                if (correctedQuery) {
                    sortByRelevance = true;
                    orderBy = { createdAt: 'desc' };
                } else {
                    orderBy = { createdAt: 'desc' };
                }
        }

        // Calculate pagination
        const skip = (params.page - 1) * params.limit;

        // Get total count for pagination
        let totalCount;
        if (useRawSqlSearch && correctedQuery && searchQueryString) {
            // Use raw SQL for count when enhanced search is enabled
            const countResult = await prisma.$queryRaw`
                SELECT COUNT(*) as count FROM "Product" p
                INNER JOIN "Store" s ON p."storeId" = s."id"
                WHERE p."inStock" = true
                AND p."status" = 'ACTIVE'
                AND p."moderationStatus" = 'APPROVED'
                AND s."isActive" = true
                AND s."vendorStatus" = 'APPROVED'
                AND (
                    -- Full-text search on searchVector
                    (p."searchVector" @@ plainto_tsquery('english', ${searchQueryString}))
                    OR
                    -- Fallback to basic ILIKE matching for broader results
                    (p."name" ILIKE ${'%' + correctedQuery + '%'}
                     OR p."description" ILIKE ${'%' + correctedQuery + '%'}
                     OR p."category" ILIKE ${'%' + correctedQuery + '%'}
                     OR p."subcategory" ILIKE ${'%' + correctedQuery + '%'}
                     OR ${correctedQuery} = ANY(p."tags"))
                )
            `;
            totalCount = parseInt(countResult[0].count);
        } else {
            totalCount = await prisma.product.count({ where });
        }

        // Fetch products with related data
        let products;
        if (useRawSqlSearch && correctedQuery && searchQueryString) {
            // Use raw SQL for enhanced full-text search
            products = await prisma.$queryRaw`
                SELECT p."id", p."name", p."description", p."mrp", p."price", p."costPrice", p."images", p."category", p."categoryId", p."subcategory", p."tags", p."attributes", p."inStock", p."currency", p."storeId", p."status", p."moderationStatus", p."flagLogs", p."sku", p."stock", p."reservedStock", p."lowStockThreshold", p."weight", p."dimensions", p."seoTitle", p."seoDescription", p."seoKeywords", p."isDigital", p."digitalFileUrl", p."promotionType", p."promotionValue", p."promotionStart", p."promotionEnd", p."basePrice", p."salePrice", p."scheduledPriceChanges", p."createdAt", p."updatedAt",
                        s."name" as "store_name", s."username" as "store_username", s."logo" as "store_logo", s."isActive" as "store_isActive",
                        c."name" as "category_name", c."slug" as "category_slug",
                        -- Calculate relevance score using ts_rank for full-text search
                        COALESCE(ts_rank(p."searchVector", plainto_tsquery('english', ${searchQueryString})), 0) as "relevanceScore"
                FROM "Product" p
                INNER JOIN "Store" s ON p."storeId" = s."id"
                LEFT JOIN "Category" c ON p."categoryId" = c."id"
                WHERE p."inStock" = true
                AND p."status" = 'ACTIVE'
                AND p."moderationStatus" = 'APPROVED'
                AND s."isActive" = true
                AND s."vendorStatus" = 'APPROVED'
                AND (
                    -- Full-text search on searchVector
                    (p."searchVector" @@ plainto_tsquery('english', ${searchQueryString}))
                    OR
                    -- Fallback to basic ILIKE matching for broader results
                    (p."name" ILIKE ${'%' + correctedQuery + '%'}
                     OR p."description" ILIKE ${'%' + correctedQuery + '%'}
                     OR p."category" ILIKE ${'%' + correctedQuery + '%'}
                     OR p."subcategory" ILIKE ${'%' + correctedQuery + '%'}
                     OR ${correctedQuery} = ANY(p."tags"))
                )
                ORDER BY
                    -- Relevance score for sorting
                    COALESCE(ts_rank(p."searchVector", plainto_tsquery('english', ${searchQueryString})), 0) DESC,
                    p."createdAt" DESC
                LIMIT ${params.limit}
                OFFSET ${skip}
            `;

            // Transform raw results to match Prisma structure
            products = products.map(row => ({
                ...row,
                store: {
                    id: row.storeId,
                    name: row.store_name,
                    username: row.store_username,
                    logo: row.store_logo,
                    isActive: row.store_isActive
                },
                categoryRef: row.categoryId ? {
                    id: row.categoryId,
                    name: row.category_name,
                    slug: row.category_slug
                } : null,
                rating: [], // We'll need to fetch ratings separately if needed
                promotionRules: [],
                mediaGallery: []
            }));
        } else {
            products = await prisma.product.findMany({
                where,
                include: {
                    rating: {
                        select: {
                            rating: true,
                            createdAt: true,
                            user: { select: { name: true, image: true } }
                        }
                    },
                    store: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            logo: true,
                            isActive: true
                        }
                    },
                    categoryRef: {
                        select: {
                            id: true,
                            name: true,
                            slug: true
                        }
                    },
                    promotionRules: {
                        where: { isActive: true }
                    },
                    mediaGallery: {
                        where: { isPrimary: true },
                        take: 1,
                        select: {
                            url: true,
                            thumbnailUrl: true,
                            alt: true
                        }
                    }
                },
                orderBy,
                skip,
                take: params.limit
            });
        }

        // Calculate average ratings and ensure relevance scores are set
        products = products.map(product => {
            const ratings = product.rating || [];
            const avgRating = ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                : 0;

            // For raw SQL queries, relevanceScore is already calculated
            // For Prisma queries, calculate it here
            let relevanceScore = product.relevanceScore || 0;
            if (!useRawSqlSearch && correctedQuery && relevanceScore === 0) {
                relevanceScore = calculateRelevanceScore(product, correctedQuery);
            }

            return {
                ...product,
                averageRating: avgRating,
                totalRatings: ratings.length,
                relevanceScore
            };
        });

        // Sort by relevance if requested
        if (sortByRelevance && correctedQuery) {
            products.sort((a, b) => b.relevanceScore - a.relevanceScore);
        }

        // Apply rating filter
        if (minAvgRating) {
            products = products.filter(p => p.averageRating >= minAvgRating);
        }

        // Sort by rating or popularity if requested
        if (params.sort === 'rating') {
            products.sort((a, b) => b.averageRating - a.averageRating);
        } else if (params.sort === 'popularity') {
            products.sort((a, b) => b.totalRatings - a.totalRatings);
        }

        // Calculate effective prices
        const productsWithPricing = products.map(product => {
            const pricing = PricingEngine.calculateEffectivePrice(product);
            return {
                id: product.id,
                name: product.name,
                description: product.description,
                price: product.price,
                mrp: product.mrp,
                images: product.images,
                category: product.category,
                categoryId: product.categoryId,
                categoryRef: product.categoryRef,
                subcategory: product.subcategory,
                tags: product.tags,
                attributes: product.attributes,
                inStock: product.inStock,
                stock: product.stock,
                sku: product.sku,
                currency: product.currency,
                averageRating: product.averageRating,
                totalRatings: product.totalRatings,
                relevanceScore: product.relevanceScore,
                store: product.store,
                mediaGallery: product.mediaGallery,
                createdAt: product.createdAt,
                effectivePrice: pricing.effectivePrice,
                originalPrice: pricing.originalPrice,
                isOnSale: pricing.isOnSale,
                discountAmount: pricing.discountAmount,
                discountPercentage: pricing.discountPercentage,
                appliedPromotions: pricing.appliedPromotions
            };
        });

        // Calculate facets
        const facets = await calculateFacets(where, params.q);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / params.limit);
        const pagination = {
            page: params.page,
            limit: params.limit,
            totalCount,
            totalPages,
            hasNext: params.page < totalPages,
            hasPrev: params.page > 1
        };

        const duration = Date.now() - startTime;

        // Log search analytics
        try {
            const userId = null; // TODO: Extract from auth if available
            const sessionId = null; // TODO: Extract from session
            const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
            const userAgent = request.headers.get('user-agent') || 'unknown';

            await logSearchQuery({
                query: params.q || '',
                userId,
                sessionId,
                ipAddress,
                userAgent,
                resultCount: productsWithPricing.length,
                correctedQuery: hasTypos ? correctedQuery : null,
                suggestions,
                duration
            });
        } catch (error) {
            logger.logError('Error logging search query', error, { query: params.q });
        }

        logger.logRequest('GET', '/api/search', 200, duration, null, null);

        return NextResponse.json({
            products: productsWithPricing,
            facets,
            pagination,
            query: params,
            suggestions,
            correctedQuery: hasTypos ? correctedQuery : undefined,
            searchDuration: duration,
            hasTypos
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        logger.logError('Search API error', error, {
            url: request.url,
            duration
        });

        return NextResponse.json({
            error: "An internal server error occurred."
        }, { status: 500 });
    }
}

// Calculate facet counts
async function calculateFacets(baseWhere, searchQuery) {
    const facets = {};

    // Brand facets - use raw SQL to avoid JSON grouping issues
    const brandCounts = await prisma.$queryRaw`
        SELECT (attributes->>'brand') as brand, COUNT(*) as count
        FROM "Product" p
        INNER JOIN "Store" s ON p."storeId" = s."id"
        WHERE p."inStock" = true
        AND p."status" = 'ACTIVE'
        AND p."moderationStatus" = 'APPROVED'
        AND s."isActive" = true
        AND s."vendorStatus" = 'APPROVED'
        AND p."attributes" IS NOT NULL
        AND p."attributes"->>'brand' IS NOT NULL
        GROUP BY p."attributes"->>'brand'
    `;

    facets.brands = {};
    brandCounts.forEach(row => {
        if (row.brand) {
            facets.brands[row.brand] = parseInt(row.count);
        }
    });

    // Category facets - use raw SQL
    const categoryCounts = await prisma.$queryRaw`
        SELECT p."categoryId", COUNT(*) as count
        FROM "Product" p
        INNER JOIN "Store" s ON p."storeId" = s."id"
        WHERE p."inStock" = true
        AND p."status" = 'ACTIVE'
        AND p."moderationStatus" = 'APPROVED'
        AND s."isActive" = true
        AND s."vendorStatus" = 'APPROVED'
        AND p."categoryId" IS NOT NULL
        GROUP BY p."categoryId"
    `;

    facets.categories = {};
    for (const row of categoryCounts) {
        if (row.categoryId) {
            const category = await prisma.category.findUnique({
                where: { id: row.categoryId },
                select: { name: true, slug: true }
            });
            if (category) {
                facets.categories[row.categoryId] = {
                    name: category.name,
                    slug: category.slug,
                    count: parseInt(row.count)
                };
            }
        }
    }

    // Price range facets
    const priceRanges = [
        { min: 0, max: 50, label: 'Under $50' },
        { min: 50, max: 100, label: '$50 - $100' },
        { min: 100, max: 200, label: '$100 - $200' },
        { min: 200, max: 500, label: '$200 - $500' },
        { min: 500, max: null, label: 'Over $500' }
    ];

    facets.priceRanges = {};
    for (const range of priceRanges) {
        const count = await prisma.product.count({
            where: {
                ...baseWhere,
                price: {
                    gte: range.min,
                    ...(range.max && { lte: range.max })
                }
            }
        });
        if (count > 0) {
            facets.priceRanges[range.label] = count;
        }
    }

    // Rating facets
    const ratingRanges = [
        { min: 4, max: 5, label: '4+ Stars' },
        { min: 3, max: 4, label: '3+ Stars' },
        { min: 2, max: 3, label: '2+ Stars' },
        { min: 1, max: 2, label: '1+ Stars' }
    ];

    facets.ratings = {};
    // For ratings, we need to calculate averages
    const productsWithRatings = await prisma.product.findMany({
        where: baseWhere,
        include: {
            rating: { select: { rating: true } }
        }
    });

    for (const range of ratingRanges) {
        let count = 0;
        for (const product of productsWithRatings) {
            const avgRating = product.rating.length > 0
                ? product.rating.reduce((sum, r) => sum + r.rating, 0) / product.rating.length
                : 0;
            if (avgRating >= range.min && avgRating < range.max) {
                count++;
            }
        }
        if (count > 0) {
            facets.ratings[range.label] = count;
        }
    }

    // Store facets - use raw SQL
    const storeCounts = await prisma.$queryRaw`
        SELECT p."storeId", COUNT(*) as count
        FROM "Product" p
        INNER JOIN "Store" s ON p."storeId" = s."id"
        WHERE p."inStock" = true
        AND p."status" = 'ACTIVE'
        AND p."moderationStatus" = 'APPROVED'
        AND s."isActive" = true
        AND s."vendorStatus" = 'APPROVED'
        GROUP BY p."storeId"
    `;

    facets.stores = {};
    for (const row of storeCounts) {
        const store = await prisma.store.findUnique({
            where: { id: row.storeId },
            select: { username: true, name: true }
        });
        if (store) {
            facets.stores[store.username] = {
                name: store.name,
                count: parseInt(row.count)
            };
        }
    }

    return facets;
}
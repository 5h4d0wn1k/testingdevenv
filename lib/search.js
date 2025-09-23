import prisma from './prisma.js';

/**
 * Finds terms similar to the given query using fuzzy matching.
 * Uses PostgreSQL similarity functions for efficient matching.
 * @param {string} query - The search query to find similar terms for
 * @param {number} threshold - Similarity threshold (0-1), default 0.3
 * @param {number} limit - Maximum number of terms to return
 * @returns {Promise<string[]>} - Array of similar terms found in the database
 * @throws {Error} - If database query fails
 */
export async function findSimilarTerms(query, threshold = 0.3, limit = 10) {
    try {
        if (!query || typeof query !== 'string') return [];

        const normalizedQuery = normalizeQuery(query);
        if (!normalizedQuery) return [];

        // Use raw SQL to find similar terms using PostgreSQL similarity
        const similarTerms = await prisma.$queryRaw`
            SELECT DISTINCT word, similarity(word, ${normalizedQuery}) as sim_score
            FROM (
                SELECT unnest(string_to_array(lower(name), ' ')) as word
                FROM "Product"
                WHERE "inStock" = true
                AND "status" = 'ACTIVE'
                AND "moderationStatus" = 'APPROVED'
                UNION
                SELECT unnest(string_to_array(lower(description), ' ')) as word
                FROM "Product"
                WHERE "inStock" = true
                AND "status" = 'ACTIVE'
                AND "moderationStatus" = 'APPROVED'
                UNION
                SELECT unnest("tags") as word
                FROM "Product"
                WHERE "inStock" = true
                AND "status" = 'ACTIVE'
                AND "moderationStatus" = 'APPROVED'
            ) words
            WHERE length(word) > 2
            AND similarity(word, ${normalizedQuery}) > ${threshold}
            ORDER BY sim_score DESC
            LIMIT ${limit}
        `;

        return similarTerms.map(row => row.word);
    } catch (error) {
        console.error('Error finding similar terms:', error);
        return [];
    }
}

/**
 * Generates a fuzzy query string with wildcards and similarity conditions.
 * @param {string} query - The original search query
 * @returns {string} - Fuzzy query string for database matching
 */
export function generateFuzzyQuery(query) {
    if (!query || typeof query !== 'string') return '';

    const normalized = normalizeQuery(query);
    if (!normalized) return '';

    // Add wildcards for fuzzy matching
    const terms = tokenizeQuery(normalized);
    return terms.map(term => `%${term}%`).join(' ');
}

/**
 * Expands a search query with synonyms from the database.
 * @param {string} query - The normalized search query
 * @returns {Promise<string[]>} - Array of expanded query terms including synonyms
 * @throws {Error} - If database query fails
 */
export async function expandWithSynonyms(query) {
    try {
        if (!query || typeof query !== 'string') return [query];

        const terms = tokenizeQuery(query);
        const expandedTerms = new Set();

        // Add original terms
        terms.forEach(term => expandedTerms.add(term));

        // Find synonyms for each term
        for (const term of terms) {
            const synonyms = await getSynonymsForTerm(term);
            synonyms.forEach(synonym => expandedTerms.add(synonym));
        }

        return Array.from(expandedTerms);
    } catch (error) {
        console.error('Error expanding with synonyms:', error);
        return [query];
    }
}

/**
 * Retrieves synonyms for a specific term from the database.
 * @param {string} term - The term to find synonyms for
 * @returns {Promise<string[]>} - Array of synonym terms
 * @throws {Error} - If database query fails
 */
export async function getSynonymsForTerm(term) {
    try {
        if (!term || typeof term !== 'string') return [];

        const synonymRecord = await prisma.searchSynonym.findUnique({
            where: { term: term.toLowerCase() },
            select: { synonyms: true, isActive: true }
        });

        if (synonymRecord && synonymRecord.isActive) {
            return synonymRecord.synonyms.map(s => s.toLowerCase());
        }

        return [];
    } catch (error) {
        console.error('Error getting synonyms for term:', error);
        return [];
    }
}

/**
 * Builds a full-text search query using PostgreSQL tsvector.
 * @param {string} query - The search query
 * @param {string[]} synonyms - Array of synonym terms
 * @returns {Object} - Full-text search query object for Prisma (using raw SQL)
 */
export function buildFullTextQuery(query, synonyms = []) {
    if (!query || typeof query !== 'string') return {};

    const allTerms = [query, ...synonyms].filter(term => term.length > 0);
    if (allTerms.length === 0) return {};

    const queryString = allTerms.join(' | '); // PostgreSQL full-text OR

    // Use raw SQL for full-text search since Prisma doesn't support tsvector directly
    return {
        searchVector: {
            search: queryString,
            config: 'english'
        }
    };
}

/**
 * Builds a similarity-based search query using PostgreSQL similarity functions.
 * @param {string} query - The search query
 * @returns {Object} - Similarity search query object for Prisma
 */
export function buildSimilarityQuery(query) {
    if (!query || typeof query !== 'string') return {};

    const normalized = normalizeQuery(query);
    if (!normalized) return {};

    // Use raw SQL for similarity as Prisma doesn't directly support it
    return {
        OR: [
            { name: { contains: normalized, mode: 'insensitive' } },
            { description: { contains: normalized, mode: 'insensitive' } },
            { tags: { has: normalized } },
            { category: { contains: normalized, mode: 'insensitive' } },
            { subcategory: { contains: normalized, mode: 'insensitive' } }
        ]
    };
}

/**
 * Combines full-text and similarity search queries.
 * @param {Object} fullTextQuery - Full-text search query object
 * @param {Object} similarityQuery - Similarity search query object
 * @returns {Object} - Combined search query object for Prisma
 */
export function combineSearchQueries(fullTextQuery, similarityQuery) {
    const combined = {};

    if (Object.keys(fullTextQuery).length > 0) {
        combined.OR = combined.OR || [];
        combined.OR.push(fullTextQuery);
    }

    if (Object.keys(similarityQuery).length > 0) {
        combined.OR = combined.OR || [];
        combined.OR.push(similarityQuery);
    }

    return combined;
}

/**
 * Finds the closest matching terms from the database using similarity.
 * @param {string} query - The search query
 * @param {number} limit - Maximum number of matches to return
 * @returns {Promise<string[]>} - Array of closest matching terms
 * @throws {Error} - If database query fails
 */
export async function findClosestMatches(query, limit = 10) {
    try {
        if (!query || typeof query !== 'string') return [];

        const normalized = normalizeQuery(query);
        if (!normalized) return [];

        // Find products with similar names
        const matches = await prisma.product.findMany({
            where: {
                inStock: true,
                status: 'ACTIVE',
                moderationStatus: 'APPROVED',
                store: {
                    isActive: true,
                    vendorStatus: 'APPROVED'
                },
                OR: [
                    { name: { contains: normalized, mode: 'insensitive' } },
                    { description: { contains: normalized, mode: 'insensitive' } }
                ]
            },
            select: {
                name: true
            },
            take: limit,
            orderBy: {
                createdAt: 'desc' // Simple ordering since _relevance is not supported
            }
        });

        return matches.map(match => match.name);
    } catch (error) {
        console.error('Error finding closest matches:', error);
        throw new Error('Failed to find closest matches');
    }
}

/**
 * Generates search suggestions based on the query and common patterns.
 * @param {string} query - The search query
 * @returns {Promise<string[]>} - Array of suggested search terms
 * @throws {Error} - If database query fails
 */
export async function generateSuggestions(query) {
    try {
        if (!query || typeof query !== 'string') return [];

        const normalized = normalizeQuery(query);
        if (!normalized) return [];

        const suggestions = new Set();

        // Get popular search terms from logs
        const popularSearches = await prisma.searchLog.findMany({
            where: {
                query: {
                    contains: normalized,
                    mode: 'insensitive'
                },
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
            },
            select: {
                query: true
            },
            take: 20,
            orderBy: {
                createdAt: 'desc'
            }
        });

        popularSearches.forEach(log => {
            if (log.query.toLowerCase().includes(normalized)) {
                suggestions.add(log.query);
            }
        });

        // Add closest matches
        const closest = await findClosestMatches(query, 5);
        closest.forEach(match => suggestions.add(match));

        return Array.from(suggestions).slice(0, 10);
    } catch (error) {
        console.error('Error generating suggestions:', error);
        return [];
    }
}

/**
 * Detects potential typos in the search query using Levenshtein distance and database matching.
 * @param {string} query - The search query to check for typos
 * @returns {Promise<Object>} - Object with correctedQuery, suggestions, and hasTypos
 * @throws {Error} - If typo detection fails
 */
export async function detectTypos(query) {
    try {
        if (!query || typeof query !== 'string') {
            return { correctedQuery: query, suggestions: [], hasTypos: false };
        }

        const normalized = normalizeQuery(query);
        if (!normalized) {
            return { correctedQuery: query, suggestions: [], hasTypos: false };
        }

        const terms = tokenizeQuery(normalized);
        const corrections = [];
        const suggestions = [];
        let hasTypos = false;

        // Check each term for potential typos
        for (const term of terms) {
            // Skip very short terms or common words
            if (term.length < 3) {
                corrections.push(term);
                continue;
            }

            // Check if term exists in database (products, categories, etc.)
            const termExists = await checkTermExists(term);

            if (!termExists) {
                // Term doesn't exist, try to find corrections
                const correction = await findBestCorrection(term);
                if (correction && correction.confidence > 0.6) {
                    corrections.push(correction.term);
                    suggestions.push(`Did you mean "${correction.term}" instead of "${term}"?`);
                    hasTypos = true;
                } else {
                    corrections.push(term);
                }
            } else {
                corrections.push(term);
            }
        }

        const correctedQuery = corrections.join(' ');

        return {
            correctedQuery: hasTypos ? correctedQuery : query,
            suggestions,
            hasTypos
        };
    } catch (error) {
        console.error('Error detecting typos:', error);
        return { correctedQuery: query, suggestions: [], hasTypos: false };
    }
}

/**
 * Checks if a term exists in the product database.
 * @param {string} term - Term to check
 * @returns {Promise<boolean>} - Whether the term exists
 */
async function checkTermExists(term) {
    try {
        const count = await prisma.product.count({
            where: {
                inStock: true,
                status: 'ACTIVE',
                moderationStatus: 'APPROVED',
                OR: [
                    { name: { contains: term, mode: 'insensitive' } },
                    { description: { contains: term, mode: 'insensitive' } },
                    { tags: { has: term } },
                    { category: { contains: term, mode: 'insensitive' } },
                    { subcategory: { contains: term, mode: 'insensitive' } }
                ]
            }
        });
        return count > 0;
    } catch (error) {
        console.error('Error checking term existence:', error);
        return false;
    }
}

/**
 * Finds the best correction for a potentially misspelled term.
 * @param {string} term - The potentially misspelled term
 * @returns {Promise<Object|null>} - Best correction with confidence score
 */
async function findBestCorrection(term) {
    try {
        // Use raw SQL to find similar terms with Levenshtein distance
        const corrections = await prisma.$queryRaw`
            SELECT word,
                   levenshtein(lower(${term}), lower(word)) as distance,
                   length(word) as word_len,
                   similarity(word, ${term}) as sim_score
            FROM (
                SELECT DISTINCT unnest(string_to_array(lower(name), ' ')) as word
                FROM "Product"
                WHERE "inStock" = true AND "status" = 'ACTIVE' AND "moderationStatus" = 'APPROVED'
                UNION
                SELECT DISTINCT unnest("tags") as word
                FROM "Product"
                WHERE "inStock" = true AND "status" = 'ACTIVE' AND "moderationStatus" = 'APPROVED'
            ) words
            WHERE length(word) > 2
            AND levenshtein(lower(${term}), lower(word)) <= 2  -- Max 2 character difference
            ORDER BY
                levenshtein(lower(${term}), lower(word)) ASC,
                sim_score DESC
            LIMIT 5
        `;

        if (corrections.length === 0) return null;

        // Calculate confidence based on distance and similarity
        const best = corrections[0];
        const distance = parseInt(best.distance);
        const similarity = parseFloat(best.sim_score);
        const lengthDiff = Math.abs(term.length - parseInt(best.word_len));

        // Confidence formula: higher similarity and lower distance = higher confidence
        let confidence = similarity;
        if (distance === 0) confidence = 1.0; // Exact match
        else if (distance === 1) confidence = Math.max(confidence, 0.8); // 1 char difference
        else if (distance === 2) confidence = Math.max(confidence, 0.6); // 2 char difference

        // Reduce confidence for large length differences
        if (lengthDiff > 2) confidence *= 0.7;

        return {
            term: best.word,
            confidence: Math.min(confidence, 1.0)
        };
    } catch (error) {
        console.error('Error finding best correction:', error);
        return null;
    }
}

/**
 * Logs search query analytics to the database.
 * @param {Object} searchData - Search data to log
 * @param {string} searchData.query - The search query
 * @param {string} [searchData.userId] - User ID if available
 * @param {string} [searchData.sessionId] - Session ID
 * @param {string} [searchData.ipAddress] - IP address
 * @param {string} [searchData.userAgent] - User agent
 * @param {number} [searchData.resultCount=0] - Number of results
 * @param {string} [searchData.correctedQuery] - Corrected query if any
 * @param {string[]} [searchData.suggestions=[]] - Suggestions provided
 * @param {number} [searchData.duration=0] - Search duration in ms
 * @returns {Promise<void>}
 * @throws {Error} - If logging fails
 */
export async function logSearchQuery(searchData) {
    try {
        const {
            query,
            userId = null,
            sessionId = null,
            ipAddress = null,
            userAgent = null,
            resultCount = 0,
            correctedQuery = null,
            suggestions = [],
            duration = 0
        } = searchData;

        if (!query) return;

        await prisma.searchLog.create({
            data: {
                query,
                userId,
                sessionId,
                ipAddress,
                userAgent,
                resultCount,
                correctedQuery,
                suggestions,
                duration
            }
        });
    } catch (error) {
        console.error('Error logging search query:', error);
        // Don't throw to avoid breaking search functionality
    }
}

/**
 * Retrieves search analytics for a given timeframe.
 * @param {string} timeframe - Timeframe for analytics ('day', 'week', 'month', 'year')
 * @returns {Promise<Object>} - Analytics data including popular queries, total searches, etc.
 * @throws {Error} - If analytics retrieval fails
 */
export async function getSearchAnalytics(timeframe = 'week') {
    try {
        const now = new Date();
        let startDate;

        switch (timeframe) {
            case 'day':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        const logs = await prisma.searchLog.findMany({
            where: {
                createdAt: {
                    gte: startDate
                }
            },
            select: {
                query: true,
                resultCount: true,
                duration: true,
                correctedQuery: true,
                createdAt: true
            }
        });

        const totalSearches = logs.length;
        const queryCounts = {};
        let totalResults = 0;
        let totalDuration = 0;
        let correctedCount = 0;

        logs.forEach(log => {
            const query = log.query.toLowerCase();
            queryCounts[query] = (queryCounts[query] || 0) + 1;
            totalResults += log.resultCount;
            totalDuration += log.duration;
            if (log.correctedQuery) correctedCount++;
        });

        const popularQueries = Object.entries(queryCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([query, count]) => ({ query, count }));

        return {
            timeframe,
            totalSearches,
            averageResults: totalSearches > 0 ? totalResults / totalSearches : 0,
            averageDuration: totalSearches > 0 ? totalDuration / totalSearches : 0,
            correctionRate: totalSearches > 0 ? correctedCount / totalSearches : 0,
            popularQueries
        };
    } catch (error) {
        console.error('Error getting search analytics:', error);
        throw new Error('Failed to retrieve search analytics');
    }
}

/**
 * Normalizes a search query by trimming whitespace, converting to lowercase,
 * and removing special characters that could interfere with search.
 * @param {string} query - The raw search query
 * @returns {string} - The normalized query
 */
export function normalizeQuery(query) {
    if (!query || typeof query !== 'string') return '';

    return query
        .trim()
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Replace special chars with space
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
}

/**
 * Tokenizes a query string into individual terms.
 * @param {string} query - The query to tokenize
 * @returns {string[]} - Array of tokenized terms
 */
export function tokenizeQuery(query) {
    if (!query || typeof query !== 'string') return [];

    return normalizeQuery(query)
        .split(' ')
        .filter(term => term.length > 0);
}

/**
 * Calculates relevance score for a product based on search terms.
 * @param {Object} product - Product object
 * @param {string} query - Search query
 * @returns {number} - Relevance score between 0 and 1
 */
export function calculateRelevanceScore(product, query) {
    if (!product || !query || typeof query !== 'string') return 0;

    const terms = tokenizeQuery(query);
    if (terms.length === 0) return 0;

    let score = 0;
    const termCount = terms.length;

    for (const term of terms) {
        let termScore = 0;

        // Name match (highest weight)
        if (product.name && product.name.toLowerCase().includes(term)) {
            termScore += 1.0;
        }

        // Description match (medium weight)
        if (product.description && product.description.toLowerCase().includes(term)) {
            termScore += 0.6;
        }

        // Tags match (high weight)
        if (product.tags && Array.isArray(product.tags) &&
            product.tags.some(tag => tag.toLowerCase().includes(term))) {
            termScore += 0.8;
        }

        // Category/Subcategory match (medium weight)
        if ((product.category && product.category.toLowerCase().includes(term)) ||
            (product.subcategory && product.subcategory.toLowerCase().includes(term))) {
            termScore += 0.5;
        }

        // Exact matches get bonus
        if ((product.name && product.name.toLowerCase() === term) ||
            (product.tags && Array.isArray(product.tags) &&
             product.tags.some(tag => tag.toLowerCase() === term))) {
            termScore += 0.3;
        }

        score += termScore;
    }

    // Normalize by term count and max possible score
    const maxPossibleScore = termCount * 2.2; // Max score per term
    return Math.min(score / maxPossibleScore, 1.0);
}
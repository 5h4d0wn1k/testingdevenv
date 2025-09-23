const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLevenshtein() {
    try {
        console.log('Testing Levenshtein function...');

        // Test if levenshtein function works
        const result = await prisma.$queryRaw`
            SELECT levenshtein('iPhone', 'iPhne') as distance,
                   levenshtein('notebook', 'laptop') as distance2
        `;

        console.log('Levenshtein test results:', result);

        // Test fuzzy matching
        const fuzzyResult = await prisma.$queryRaw`
            SELECT word,
                   levenshtein(lower(${ 'iPhne' }), lower(word)) as distance
            FROM (
                SELECT DISTINCT unnest(string_to_array(lower(name), ' ')) as word
                FROM "Product"
                WHERE "inStock" = true AND "status" = 'ACTIVE' AND "moderationStatus" = 'APPROVED'
            ) words
            WHERE length(word) > 2
            AND levenshtein(lower(${ 'iPhne' }), lower(word)) <= 2
            ORDER BY levenshtein(lower(${ 'iPhne' }), lower(word)) ASC
            LIMIT 5
        `;

        console.log('Fuzzy matching test results:', fuzzyResult);

    } catch (error) {
        console.error('Error testing levenshtein:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testLevenshtein();
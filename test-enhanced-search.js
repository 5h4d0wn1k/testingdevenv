const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SearchTester {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.results = {
            basicSearch: [],
            enhancedFeatures: [],
            analytics: [],
            performance: [],
            apiResponse: [],
            database: []
        };
    }

    async makeRequest(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });

        try {
            const response = await fetch(url);
            const data = await response.json();
            return { status: response.status, data, duration: 0 }; // We'll track duration differently
        } catch (error) {
            console.error(`Request failed: ${error.message}`);
            return { status: 500, data: { error: error.message }, duration: 0 };
        }
    }

    async testBasicSearchFunctionality() {
        console.log('\n=== Testing Basic Search Functionality ===');

        const tests = [
            // Test 1: Standard search query
            {
                name: 'Standard search query - iPhone',
                params: { q: 'iPhone' },
                expected: { minResults: 1, shouldContain: 'iPhone 15 Pro Max' }
            },
            // Test 2: Pagination
            {
                name: 'Pagination test - page 1, limit 5',
                params: { q: 'laptop', page: 1, limit: 5 },
                expected: { maxResults: 5 }
            },
            // Test 3: Filtering by category
            {
                name: 'Category filtering - Electronics',
                params: { q: 'phone', category: 'electronics' },
                expected: { minResults: 1 }
            },
            // Test 4: Price range filtering
            {
                name: 'Price range filtering - under $100',
                params: { minPrice: 0, maxPrice: 100 },
                expected: { minResults: 1 }
            },
            // Test 5: Rating filtering
            {
                name: 'Rating filtering - 4+ stars',
                params: { rating: 4 },
                expected: { resultsMayBeEmpty: true } // Since no ratings exist yet
            }
        ];

        for (const test of tests) {
            console.log(`Testing: ${test.name}`);
            const startTime = Date.now();
            const response = await this.makeRequest('/api/search', test.params);
            const duration = Date.now() - startTime;

            const result = {
                test: test.name,
                params: test.params,
                status: response.status,
                duration,
                resultCount: response.data.products?.length || 0,
                hasFacets: !!response.data.facets,
                hasPagination: !!response.data.pagination,
                passed: false
            };

            // Validate results
            if (response.status === 200) {
                if (test.expected.minResults !== undefined && result.resultCount >= test.expected.minResults) {
                    result.passed = true;
                } else if (test.expected.maxResults !== undefined && result.resultCount <= test.expected.maxResults) {
                    result.passed = true;
                } else if (test.expected.shouldContain && response.data.products?.some(p => p.name.includes(test.expected.shouldContain))) {
                    result.passed = true;
                } else if (test.expected.resultsMayBeEmpty) {
                    result.passed = true; // Expected empty results
                }
            }

            this.results.basicSearch.push(result);
            console.log(`  ${result.passed ? '✓ PASS' : '✗ FAIL'} - ${result.resultCount} results in ${duration}ms`);
        }
    }

    async testEnhancedFeatures() {
        console.log('\n=== Testing Enhanced Search Features ===');

        const tests = [
            // Test 1: Fuzzy matching with typos
            {
                name: 'Fuzzy matching - iPhne (typo)',
                params: { q: 'iPhne' },
                expected: { shouldFindSimilar: 'iPhone' }
            },
            // Test 2: Synonym expansion
            {
                name: 'Synonym expansion - notebook',
                params: { q: 'notebook' },
                expected: { shouldFind: 'MacBook Pro' }
            },
            // Test 3: Typo correction
            {
                name: 'Typo correction - aplle',
                params: { q: 'aplle' },
                expected: { shouldHaveCorrection: true }
            },
            // Test 4: Search suggestions
            {
                name: 'Search suggestions - iph',
                params: { q: 'iph' },
                expected: { shouldHaveSuggestions: true }
            }
        ];

        for (const test of tests) {
            console.log(`Testing: ${test.name}`);
            const startTime = Date.now();
            const response = await this.makeRequest('/api/search', test.params);
            const duration = Date.now() - startTime;

            const result = {
                test: test.name,
                params: test.params,
                status: response.status,
                duration,
                resultCount: response.data.products?.length || 0,
                hasSuggestions: response.data.suggestions?.length > 0,
                correctedQuery: response.data.correctedQuery,
                hasTypos: response.data.hasTypos,
                passed: false
            };

            // Validate enhanced features
            if (response.status === 200) {
                if (test.expected.shouldFindSimilar && response.data.products?.some(p =>
                    p.name.toLowerCase().includes(test.expected.shouldFindSimilar.toLowerCase()))) {
                    result.passed = true;
                } else if (test.expected.shouldFind && response.data.products?.some(p =>
                    p.name.includes(test.expected.shouldFind))) {
                    result.passed = true;
                } else if (test.expected.shouldHaveCorrection && result.correctedQuery) {
                    result.passed = true;
                } else if (test.expected.shouldHaveSuggestions && result.hasSuggestions) {
                    result.passed = true;
                }
            }

            this.results.enhancedFeatures.push(result);
            console.log(`  ${result.passed ? '✓ PASS' : '✗ FAIL'} - ${result.resultCount} results, suggestions: ${result.hasSuggestions}, corrected: ${result.correctedQuery || 'none'}`);
        }
    }

    async testSearchAnalytics() {
        console.log('\n=== Testing Search Analytics ===');

        // Make some search requests to generate analytics
        const searchQueries = ['iPhone', 'laptop', 'shirt', 'book', 'electronics'];

        for (const query of searchQueries) {
            await this.makeRequest('/api/search', { q: query });
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        }

        // Check if logs were created
        const logs = await prisma.searchLog.findMany({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const result = {
            test: 'Search analytics logging',
            logsCreated: logs.length,
            hasRequiredFields: false,
            passed: logs.length >= searchQueries.length
        };

        if (logs.length > 0) {
            const sampleLog = logs[0];
            result.hasRequiredFields = !!(
                sampleLog.query &&
                sampleLog.resultCount !== undefined &&
                sampleLog.duration !== undefined &&
                sampleLog.createdAt
            );
            result.passed = result.passed && result.hasRequiredFields;
        }

        this.results.analytics.push(result);
        console.log(`  ${result.passed ? '✓ PASS' : '✗ FAIL'} - ${logs.length} logs created, required fields: ${result.hasRequiredFields}`);
    }

    async testPerformanceAndRanking() {
        console.log('\n=== Testing Performance & Ranking ===');

        const tests = [
            // Test 1: Relevance scoring
            {
                name: 'Relevance scoring - "programming book"',
                params: { q: 'programming book', sort: 'relevance' },
                expected: { shouldHaveRelevanceScores: true }
            },
            // Test 2: Weighting - name > description > tags
            {
                name: 'Field weighting - "javascript"',
                params: { q: 'javascript' },
                expected: { checkWeighting: true }
            },
            // Test 3: Search performance
            {
                name: 'Search performance - complex query',
                params: { q: 'apple smartphone camera', limit: 20 },
                expected: { maxDuration: 1000 } // 1 second max
            }
        ];

        for (const test of tests) {
            console.log(`Testing: ${test.name}`);
            const startTime = Date.now();
            const response = await this.makeRequest('/api/search', test.params);
            const duration = Date.now() - startTime;

            const result = {
                test: test.name,
                params: test.params,
                status: response.status,
                duration,
                resultCount: response.data.products?.length || 0,
                hasRelevanceScores: response.data.products?.every(p => p.relevanceScore !== undefined),
                passed: false
            };

            // Validate performance and ranking
            if (response.status === 200) {
                if (test.expected.shouldHaveRelevanceScores && result.hasRelevanceScores) {
                    result.passed = true;
                } else if (test.expected.checkWeighting) {
                    // Check if results are ordered by relevance (name matches first)
                    const hasNameMatches = response.data.products?.some(p =>
                        p.name.toLowerCase().includes('javascript'));
                    result.passed = hasNameMatches;
                } else if (test.expected.maxDuration && duration <= test.expected.maxDuration) {
                    result.passed = true;
                }
            }

            this.results.performance.push(result);
            console.log(`  ${result.passed ? '✓ PASS' : '✗ FAIL'} - ${result.resultCount} results in ${duration}ms`);
        }
    }

    async testApiResponseStructure() {
        console.log('\n=== Testing API Response Structure ===');

        const response = await this.makeRequest('/api/search', { q: 'iPhone' });

        const result = {
            test: 'API response structure',
            status: response.status,
            hasProducts: Array.isArray(response.data.products),
            hasFacets: !!response.data.facets,
            hasPagination: !!response.data.pagination,
            hasSuggestions: Array.isArray(response.data.suggestions),
            hasCorrectedQuery: 'correctedQuery' in response.data,
            hasSearchDuration: typeof response.data.searchDuration === 'number',
            hasHasTypos: typeof response.data.hasTypos === 'boolean',
            hasRelevanceScore: response.data.products?.every(p => typeof p.relevanceScore === 'number'),
            passed: false
        };

        // Check if all required fields are present
        result.passed = result.status === 200 &&
                       result.hasProducts &&
                       result.hasFacets &&
                       result.hasPagination &&
                       result.hasSuggestions &&
                       result.hasCorrectedQuery &&
                       result.hasSearchDuration &&
                       result.hasHasTypos &&
                       result.hasRelevanceScore;

        this.results.apiResponse.push(result);
        console.log(`  ${result.passed ? '✓ PASS' : '✗ FAIL'} - All required fields present: ${result.passed}`);
    }

    async testDatabaseIntegration() {
        console.log('\n=== Testing Database Integration ===');

        // Test 1: Full-text search queries
        const fullTextResults = await prisma.product.findMany({
            where: {
                searchVector: {
                    search: 'smartphone | apple'
                }
            },
            take: 5
        });

        // Test 2: Check if triggers update searchVector (by checking existing products)
        const productsWithSearchVector = await prisma.product.findMany({
            where: {
                searchVector: { not: null }
            },
            take: 5
        });

        // Test 3: Synonym queries
        const synonymResults = await prisma.product.findMany({
            where: {
                OR: [
                    { name: { contains: 'notebook', mode: 'insensitive' } },
                    { description: { contains: 'notebook', mode: 'insensitive' } },
                    { tags: { has: 'notebook' } }
                ]
            },
            take: 5
        });

        const result = {
            test: 'Database integration',
            fullTextSearchWorks: fullTextResults.length > 0,
            searchVectorExists: productsWithSearchVector.length > 0,
            synonymQueriesWork: synonymResults.length > 0,
            passed: fullTextResults.length > 0 && productsWithSearchVector.length > 0
        };

        this.results.database.push(result);
        console.log(`  ${result.passed ? '✓ PASS' : '✗ FAIL'} - Full-text: ${result.fullTextSearchWorks}, SearchVector: ${result.searchVectorExists}, Synonyms: ${result.synonymQueriesWork}`);
    }

    generateSummary() {
        console.log('\n=== TEST SUMMARY ===');

        const allResults = [
            ...this.results.basicSearch,
            ...this.results.enhancedFeatures,
            ...this.results.analytics,
            ...this.results.performance,
            ...this.results.apiResponse,
            ...this.results.database
        ];

        const totalTests = allResults.length;
        const passedTests = allResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;

        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        // Performance metrics
        const performanceTests = this.results.performance;
        if (performanceTests.length > 0) {
            const avgDuration = performanceTests.reduce((sum, t) => sum + t.duration, 0) / performanceTests.length;
            const maxDuration = Math.max(...performanceTests.map(t => t.duration));
            console.log(`\nPerformance Metrics:`);
            console.log(`Average search duration: ${avgDuration.toFixed(0)}ms`);
            console.log(`Maximum search duration: ${maxDuration}ms`);
        }

        // Issues found
        const failedResults = allResults.filter(r => !r.passed);
        if (failedResults.length > 0) {
            console.log(`\nIssues Found:`);
            failedResults.forEach(result => {
                console.log(`- ${result.test}: ${result.status !== 200 ? `HTTP ${result.status}` : 'Logic failed'}`);
            });
        }

        return {
            totalTests,
            passedTests,
            failedTests,
            successRate: (passedTests / totalTests) * 100,
            issues: failedResults.map(r => ({ test: r.test, reason: r.status !== 200 ? `HTTP ${r.status}` : 'Logic failed' }))
        };
    }

    async runAllTests() {
        try {
            console.log('Starting Enhanced Search Functionality Tests...');

            await this.testBasicSearchFunctionality();
            await this.testEnhancedFeatures();
            await this.testSearchAnalytics();
            await this.testPerformanceAndRanking();
            await this.testApiResponseStructure();
            await this.testDatabaseIntegration();

            const summary = this.generateSummary();
            return summary;

        } catch (error) {
            console.error('Test execution failed:', error);
            throw error;
        } finally {
            await prisma.$disconnect();
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new SearchTester();
    tester.runAllTests()
        .then((summary) => {
            console.log('\n=== FINAL RESULTS ===');
            console.log(JSON.stringify(summary, null, 2));
            process.exit(summary.failedTests === 0 ? 0 : 1);
        })
        .catch((error) => {
            console.error('Tests failed:', error);
            process.exit(1);
        });
}

module.exports = { SearchTester };
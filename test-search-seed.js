const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedSearchData() {
    try {
        console.log('Seeding search test data...');

        // Create test categories
        const electronicsCategory = await prisma.category.upsert({
            where: { slug: 'electronics' },
            update: {},
            create: {
                name: 'Electronics',
                slug: 'electronics',
                description: 'Electronic devices and gadgets'
            }
        });

        const booksCategory = await prisma.category.upsert({
            where: { slug: 'books' },
            update: {},
            create: {
                name: 'Books',
                slug: 'books',
                description: 'Books and publications'
            }
        });

        // Use existing stores
        const stores = await prisma.store.findMany({
            take: 2,
            where: {
                isActive: true,
                vendorStatus: 'APPROVED'
            }
        });

        if (stores.length < 2) {
            throw new Error('Need at least 2 active stores for testing');
        }

        const appleStore = stores[0];
        const bookstore = stores[1];

        console.log(`Using stores: ${appleStore.username} and ${bookstore.username}`);

        // Create test products
        const products = [
            {
                name: 'iPhone 15 Pro Max',
                description: 'The most advanced iPhone with Pro camera system, A17 Pro chip, and titanium design.',
                price: 1199.99,
                mrp: 1299.99,
                category: 'Smartphones',
                categoryId: electronicsCategory.id,
                tags: ['smartphone', 'apple', 'iphone', 'mobile', 'pro'],
                storeId: appleStore.id,
                sku: 'IPH15PM',
                stock: 50
            },
            {
                name: 'MacBook Pro 16-inch',
                description: 'Supercharged by M3 Pro or M3 Max chip. Up to 22 hours of battery life.',
                price: 2499.99,
                mrp: 2699.99,
                category: 'Laptops',
                categoryId: electronicsCategory.id,
                tags: ['laptop', 'apple', 'macbook', 'pro', 'computer', 'notebook'],
                storeId: appleStore.id,
                sku: 'MBP16M3',
                stock: 25
            },
            {
                name: 'JavaScript: The Good Parts',
                description: 'A guide to the best features of JavaScript by Douglas Crockford.',
                price: 29.99,
                mrp: 39.99,
                category: 'Programming',
                categoryId: booksCategory.id,
                tags: ['javascript', 'programming', 'book', 'coding', 'web development'],
                storeId: bookstore.id,
                sku: 'JSGOODPARTS',
                stock: 100
            },
            {
                name: 'Python Crash Course',
                description: 'A hands-on, project-based introduction to programming with Python.',
                price: 24.99,
                mrp: 29.99,
                category: 'Programming',
                categoryId: booksCategory.id,
                tags: ['python', 'programming', 'book', 'coding', 'beginner'],
                storeId: bookstore.id,
                sku: 'PYCRASH',
                stock: 75
            },
            {
                name: 'iPad Air',
                description: 'Thin. Light. Versatile. With the M2 chip and all-day battery life.',
                price: 599.99,
                mrp: 649.99,
                category: 'Tablets',
                categoryId: electronicsCategory.id,
                tags: ['tablet', 'apple', 'ipad', 'mobile', 'm2'],
                storeId: appleStore.id,
                sku: 'IPADAIR',
                stock: 40
            },
            {
                name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
                description: 'A handbook of agile software craftsmanship by Robert C. Martin.',
                price: 34.99,
                mrp: 44.99,
                category: 'Programming',
                categoryId: booksCategory.id,
                tags: ['clean code', 'programming', 'book', 'agile', 'software craftsmanship'],
                storeId: bookstore.id,
                sku: 'CLEANCODE',
                stock: 60
            },
            {
                name: 'AirPods Pro',
                description: 'Wireless earbuds with active noise cancellation and transparency mode.',
                price: 249.99,
                mrp: 279.99,
                category: 'Audio',
                categoryId: electronicsCategory.id,
                tags: ['earbuds', 'apple', 'airpods', 'wireless', 'audio'],
                storeId: appleStore.id,
                sku: 'AIRPODSPRO',
                stock: 80
            },
            {
                name: 'The Pragmatic Programmer',
                description: 'Your journey to mastery by David Thomas and Andrew Hunt.',
                price: 39.99,
                mrp: 49.99,
                category: 'Programming',
                categoryId: booksCategory.id,
                tags: ['pragmatic', 'programming', 'book', 'software development', 'best practices'],
                storeId: bookstore.id,
                sku: 'PRAGMATIC',
                stock: 45
            },
            {
                name: 'Mac Mini M2',
                description: 'The most versatile, powerful, and compact Mac ever.',
                price: 599.99,
                mrp: 699.99,
                category: 'Desktops',
                categoryId: electronicsCategory.id,
                tags: ['desktop', 'apple', 'mac mini', 'm2', 'computer', 'compact'],
                storeId: appleStore.id,
                sku: 'MACMINIM2',
                stock: 30
            },
            {
                name: 'Design Patterns: Elements of Reusable Object-Oriented Software',
                description: 'The Gang of Four book on design patterns.',
                price: 49.99,
                mrp: 59.99,
                category: 'Programming',
                categoryId: booksCategory.id,
                tags: ['design patterns', 'programming', 'book', 'object oriented', 'software architecture'],
                storeId: bookstore.id,
                sku: 'DESIGNPATTERNS',
                stock: 35
            }
        ];

        console.log('Creating products...');
        // First, try to find existing products by name to avoid duplicates
        for (const productData of products) {
            const existingProduct = await prisma.product.findFirst({
                where: { name: productData.name }
            });

            if (!existingProduct) {
                await prisma.product.create({
                    data: {
                        ...productData,
                        status: 'ACTIVE',
                        moderationStatus: 'APPROVED',
                        inStock: true
                    }
                });
            } else {
                console.log(`Product "${productData.name}" already exists, skipping...`);
            }
        }

        // Create search synonyms
        const synonyms = [
            {
                term: 'iphone',
                synonyms: ['iPhone', 'apple phone', 'smartphone']
            },
            {
                term: 'macbook',
                synonyms: ['MacBook', 'laptop', 'notebook', 'apple laptop']
            },
            {
                term: 'javascript',
                synonyms: ['JavaScript', 'JS', 'ECMAScript']
            },
            {
                term: 'python',
                synonyms: ['Python', 'python programming']
            },
            {
                term: 'programming',
                synonyms: ['coding', 'development', 'software development']
            },
            {
                term: 'book',
                synonyms: ['textbook', 'manual', 'guide', 'reference']
            },
            {
                term: 'computer',
                synonyms: ['PC', 'desktop', 'laptop', 'machine']
            }
        ];

        console.log('Creating synonyms...');
        for (const synonymData of synonyms) {
            await prisma.searchSynonym.upsert({
                where: { term: synonymData.term },
                update: synonymData,
                create: synonymData
            });
        }

        console.log('Search test data seeded successfully!');
        console.log(`Created ${products.length} products and ${synonyms.length} synonyms`);

    } catch (error) {
        console.error('Error seeding search data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    seedSearchData()
        .then(() => {
            console.log('Seeding completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seeding failed:', error);
            process.exit(1);
        });
}

module.exports = { seedSearchData };
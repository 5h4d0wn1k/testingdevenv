const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create basic categories
  const categories = [
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      displayOrder: 1
    },
    {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Fashion and apparel',
      displayOrder: 2
    },
    {
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      description: 'Home appliances and kitchenware',
      displayOrder: 3
    },
    {
      name: 'Books',
      slug: 'books',
      description: 'Books and publications',
      displayOrder: 4
    },
    {
      name: 'Sports & Outdoors',
      slug: 'sports-outdoors',
      description: 'Sports equipment and outdoor gear',
      displayOrder: 5
    },
    {
      name: 'Beauty & Personal Care',
      slug: 'beauty-personal-care',
      description: 'Cosmetics and personal care products',
      displayOrder: 6
    }
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category
    })
  }

  console.log('Categories seeded successfully')

  // Create sample attribute templates
  const attributeTemplates = [
    // Electronics
    {
      category: 'Electronics',
      name: 'Brand',
      type: 'text',
      required: true,
      displayOrder: 1
    },
    {
      category: 'Electronics',
      name: 'Model Number',
      type: 'text',
      required: false,
      displayOrder: 2
    },
    {
      category: 'Electronics',
      name: 'Warranty Period',
      type: 'number',
      required: false,
      unit: 'months',
      displayOrder: 3
    },
    {
      category: 'Electronics',
      name: 'Battery Life',
      type: 'number',
      required: false,
      unit: 'hours',
      displayOrder: 4
    },

    // Clothing
    {
      category: 'Clothing',
      name: 'Brand',
      type: 'text',
      required: true,
      displayOrder: 1
    },
    {
      category: 'Clothing',
      name: 'Size',
      type: 'select',
      required: true,
      options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      displayOrder: 2
    },
    {
      category: 'Clothing',
      name: 'Color',
      type: 'text',
      required: true,
      displayOrder: 3
    },
    {
      category: 'Clothing',
      name: 'Material',
      type: 'text',
      required: false,
      displayOrder: 4
    },
    {
      category: 'Clothing',
      name: 'Care Instructions',
      type: 'text',
      required: false,
      displayOrder: 5
    },

    // Home & Kitchen
    {
      category: 'Home & Kitchen',
      name: 'Brand',
      type: 'text',
      required: true,
      displayOrder: 1
    },
    {
      category: 'Home & Kitchen',
      name: 'Material',
      type: 'text',
      required: false,
      displayOrder: 2
    },
    {
      category: 'Home & Kitchen',
      name: 'Dimensions',
      type: 'text',
      required: false,
      unit: 'L x W x H (inches)',
      displayOrder: 3
    },
    {
      category: 'Home & Kitchen',
      name: 'Dishwasher Safe',
      type: 'boolean',
      required: false,
      displayOrder: 4
    }
  ]

  for (const template of attributeTemplates) {
    await prisma.productAttributeTemplate.upsert({
      where: {
        category_name: {
          category: template.category,
          name: template.name
        }
      },
      update: template,
      create: template
    })
  }

  console.log('Attribute templates seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
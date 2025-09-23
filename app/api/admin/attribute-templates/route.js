import prisma from "@/lib/prisma"
import authAdmin from "@/middlewares/authAdmin"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const createTemplateSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['text', 'number', 'select', 'boolean', 'date'], 'Invalid type'),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
    validation: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        pattern: z.string().optional(),
    }).optional(),
    unit: z.string().optional(),
    displayOrder: z.number().optional(),
})

const updateTemplateSchema = createTemplateSchema.partial()

// GET /api/admin/attribute-templates - Get all attribute templates
export async function GET(request) {
    try {
        const { userId } = getAuth(request)
        const adminId = await authAdmin(userId)

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')

        const where = category ? { category, isActive: true } : { isActive: true }

        const templates = await prisma.productAttributeTemplate.findMany({
            where,
            orderBy: [
                { category: 'asc' },
                { displayOrder: 'asc' },
                { createdAt: 'desc' }
            ]
        })

        // Group by category
        const groupedTemplates = templates.reduce((acc, template) => {
            if (!acc[template.category]) {
                acc[template.category] = []
            }
            acc[template.category].push(template)
            return acc
        }, {})

        return NextResponse.json({ templates: groupedTemplates })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST /api/admin/attribute-templates - Create new attribute template
export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const adminId = await authAdmin(userId)

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const validation = createTemplateSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validation.error.errors
            }, { status: 400 })
        }

        const { category, name, type, required = false, options, validation: validationRules, unit, displayOrder = 0 } = validation.data

        // Check if template already exists
        const existing = await prisma.productAttributeTemplate.findUnique({
            where: {
                category_name: {
                    category,
                    name
                }
            }
        })

        if (existing) {
            return NextResponse.json({
                error: 'Attribute template already exists for this category'
            }, { status: 400 })
        }

        const template = await prisma.productAttributeTemplate.create({
            data: {
                category,
                name,
                type,
                required,
                options: options ? JSON.stringify(options) : null,
                validation: validationRules ? JSON.stringify(validationRules) : null,
                unit,
                displayOrder
            }
        })

        return NextResponse.json({ template }, { status: 201 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PUT /api/admin/attribute-templates/[id] - Update attribute template
export async function PUT(request) {
    try {
        const { userId } = getAuth(request)
        const adminId = await authAdmin(userId)

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const url = new URL(request.url)
        const id = url.pathname.split('/').pop()

        const body = await request.json()
        const validation = updateTemplateSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validation.error.errors
            }, { status: 400 })
        }

        const updateData = { ...validation.data }
        if (updateData.options) {
            updateData.options = JSON.stringify(updateData.options)
        }
        if (updateData.validation) {
            updateData.validation = JSON.stringify(updateData.validation)
        }

        const template = await prisma.productAttributeTemplate.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json({ template })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE /api/admin/attribute-templates/[id] - Delete attribute template
export async function DELETE(request) {
    try {
        const { userId } = getAuth(request)
        const adminId = await authAdmin(userId)

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const url = new URL(request.url)
        const id = url.pathname.split('/').pop()

        // Check if template is being used
        const usageCount = await prisma.productAttributeValue.count({
            where: { templateId: id }
        })

        if (usageCount > 0) {
            // Soft delete - just deactivate
            await prisma.productAttributeTemplate.update({
                where: { id },
                data: { isActive: false }
            })
        } else {
            // Hard delete if not used
            await prisma.productAttributeTemplate.delete({
                where: { id }
            })
        }

        return NextResponse.json({ message: 'Template deleted successfully' })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
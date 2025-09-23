import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// GET /api/store/attribute-templates?category=Electronics - Get attribute templates for a category
export async function GET(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')

        if (!category) {
            return NextResponse.json({ error: 'Category parameter is required' }, { status: 400 })
        }

        const templates = await prisma.productAttributeTemplate.findMany({
            where: {
                category,
                isActive: true
            },
            orderBy: { displayOrder: 'asc' }
        })

        // Parse JSON fields
        const parsedTemplates = templates.map(template => ({
            ...template,
            options: template.options ? JSON.parse(template.options) : null,
            validation: template.validation ? JSON.parse(template.validation) : null
        }))

        return NextResponse.json({ templates: parsedTemplates })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
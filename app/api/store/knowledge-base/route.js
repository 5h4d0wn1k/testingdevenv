import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: Return static knowledge base articles with optional search
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');

        const where = {};

        if (category) {
            const validCategories = ['POLICIES', 'BEST_PRACTICES', 'TROUBLESHOOTING'];
            if (validCategories.includes(category.toUpperCase())) {
                where.category = category.toUpperCase();
            }
        }

        if (search) {
            where.OR = [
                {
                    title: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    content: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            ];
        }

        const articles = await prisma.knowledgeBase.findMany({
            where,
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json({ articles });
    } catch (error) {
        console.error('Error fetching knowledge base articles:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
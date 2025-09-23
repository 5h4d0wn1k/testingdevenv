import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import imagekit from "@/configs/imageKit";

const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        await limiter.check(request, 5); // 5 uploads per minute

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        const formData = await request.formData();
        const files = formData.getAll('files');
        const documentType = formData.get('documentType') || 'additional';

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "No files provided" }, { status: 400 });
        }

        // Validate file types and sizes
        for (const file of files) {
            if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                return NextResponse.json({ error: "Invalid file type. Only images and PDFs allowed." }, { status: 400 });
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB
                return NextResponse.json({ error: "File size too large. Max 5MB." }, { status: 400 });
            }
        }

        const uploadedDocs = [];

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());

            const uploadResponse = await imagekit.upload({
                file: buffer,
                fileName: file.name,
                folder: '/vendor-documents'
            });

            const doc = await prisma.vendorDocument.create({
                data: {
                    storeId,
                    documentType,
                    documentUrl: uploadResponse.url,
                    status: 'pending'
                }
            });

            uploadedDocs.push(doc);
        }

        return NextResponse.json({ message: "Documents uploaded successfully", documents: uploadedDocs });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        await limiter.check(request, 20); // 20 requests per minute

        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        const documents = await prisma.vendorDocument.findMany({
            where: { storeId },
            orderBy: { uploadedAt: 'desc' }
        });

        return NextResponse.json({ documents });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
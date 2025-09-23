import { NextRequest, NextResponse } from 'next/server';
import imagekit from '@/configs/imageKit';
import { fileTypeFromBuffer } from 'file-type';
import { auth } from '@clerk/nextjs/server';
import path from 'path';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request) {
    try {
        // Rate limiting: 10 requests per minute for file uploads
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const files = formData.getAll('file');
        const folder = formData.get('folder') || '/platform';

        if (files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        let totalSize = 0;
        const results = [];

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const size = buffer.length;

            if (size > 5 * 1024 * 1024) {
                return NextResponse.json({ error: `File ${file.name} exceeds maximum size of 5MB` }, { status: 400 });
            }

            totalSize += size;
            if (totalSize > 10 * 1024 * 1024) {
                return NextResponse.json({ error: 'Total upload size exceeds 10MB' }, { status: 400 });
            }

            const type = await fileTypeFromBuffer(buffer);
            if (!type || !allowedTypes.includes(type.mime)) {
                return NextResponse.json({ error: `File ${file.name} has invalid type. Only JPEG, PNG, WebP, GIF allowed.` }, { status: 400 });
            }

            const ext = path.extname(file.name).toLowerCase();
            if (!allowedExts.includes(ext)) {
                return NextResponse.json({ error: `File ${file.name} has invalid extension.` }, { status: 400 });
            }

            const str = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
            if (str.includes('<script') || str.includes('<?php') || str.includes('javascript:') || str.includes('eval(')) {
                return NextResponse.json({ error: `File ${file.name} contains suspicious content.` }, { status: 400 });
            }

            const signatures = {
                jpeg: [0xFF, 0xD8, 0xFF],
                png: [0x89, 0x50, 0x4E, 0x47],
                gif: [0x47, 0x49, 0x46],
                webp: [0x52, 0x49, 0x46, 0x46]
            };
            let validSig = false;
            for (const sig of Object.values(signatures)) {
                if (buffer.subarray(0, sig.length).equals(Buffer.from(sig))) {
                    validSig = true;
                    break;
                }
            }
            if (!validSig) {
                return NextResponse.json({ error: `File ${file.name} has invalid file signature.` }, { status: 400 });
            }

            const result = await imagekit.upload({
                file: buffer,
                fileName: `${file.name}_${Date.now()}`,
                folder
            });
            results.push({ url: result.url, name: file.name });
        }

        const response = files.length === 1 ? { url: results[0].url } : { urls: results };
        return NextResponse.json(response, {
            headers: {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
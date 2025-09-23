import { openai } from "@/configs/openai";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { aiSchema } from "@/lib/validations";

async function main(base64Image, mimeType) {
    const messages = [
        {
            role: "system",
            content: `
                        You are a product listing assistant for an e-commerce store.
                        Your job is to analyze an image of a product and generate structured data.

                        Respond ONLY with raw JSON (no code block, no markdown, no explanation).
                        The JSON must strictly follow this schema:

                        {
                        "name": string,               // Short product name
                        "description": string,         // Marketing-friendly description of the product
                        }
                   `
        },
        {
            role: "user",
            content: [
                { type: "text", text: "Analyze this image and return name + description." },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            ],
        },
    ];

    const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL,
        messages,
    });

    const raw = response.choices[0].message.content;
    console.log(raw);

    // remove ```json or ``` wrappers if present
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error("AI did not return valid JSON");
    }

    return parsed;

}


export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const isAdmin = await authSeller(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }
        const { base64Image, mimeType } = await request.json();

        const validation = aiSchema.safeParse({base64Image, mimeType})
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        const { base64Image: validatedBase64Image, mimeType: validatedMimeType } = validation.data

        const result = await main(validatedBase64Image, validatedMimeType);
        return NextResponse.json({ ...result });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

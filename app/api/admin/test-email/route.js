import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import authAdmin from "@/middlewares/authAdmin";
import { rateLimit } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

// Schema for test email request
const testEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request) {
  try {
    // Rate limiting: 10 requests per minute for test email
    const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
    if (rateLimitResponse) return rateLimitResponse;

    // Authenticate user
    const { userId } = getAuth(request);
    const isAdmin = await authAdmin(userId);

    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { email } = testEmailSchema.parse(body);

    // Send test email
    await sendEmail({
      to: email,
      subject: "Test Email from DavCreations Admin",
      text: "This is a test email to verify your email configuration.",
      html: "<p>This is a test email to verify your email configuration.</p>",
    });

    return NextResponse.json({ message: "Test email sent successfully" });
  } catch (error) {
    console.error("Error sending test email:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to send test email" },
      { status: 500 }
    );
  }
}
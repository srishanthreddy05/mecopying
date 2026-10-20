import { NextRequest, NextResponse } from "next/server";
import { reportSchema } from "@/lib/validations";
import { createReport } from "@/lib/data-service";
import { checkRateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const rateLimit = checkRateLimit(`report:${ip}`, 5, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many reports submitted. Please wait." },
      { status: 429 }
    );
  }

  try {
    const rawBody = await req.json();
    const parsed = reportSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    await createReport({
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      details: parsed.data.details,
    });

    return NextResponse.json({
      success: true,
      message: "Report received. Our moderation system will review this content.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error submitting report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

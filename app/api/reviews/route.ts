import { NextRequest, NextResponse } from "next/server";
import { createReview, getReviews } from "@/lib/data-service";
import { createReviewSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "6", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const data = await getReviews({
      limit: isNaN(limit) ? 6 : limit,
      offset: isNaN(offset) ? 0 : offset,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load reviews";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    // Rate-limit review submissions: max 5 reviews per hour per IP
    const rateLimit = checkRateLimit(`review-submit:${ip}`, 5, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many review submissions from your IP. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = createReviewSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // Basic sanitization
    const cleanName = parsed.data.name.replace(/[<>]/g, "");
    const cleanReview = parsed.data.review.replace(/[<>]/g, "");

    if (!cleanName.trim()) {
      return NextResponse.json({ error: "Please enter a valid name." }, { status: 400 });
    }
    if (!cleanReview.trim()) {
      return NextResponse.json({ error: "Please enter review text." }, { status: 400 });
    }

    const created = await createReview({
      name: cleanName,
      rating: parsed.data.rating,
      review: cleanReview,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Thank you! Your review has been posted.",
        review: created,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to post review";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

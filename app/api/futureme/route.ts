import { NextRequest, NextResponse } from "next/server";
import { createFutureMessageSchema } from "@/lib/validations";
import { createFutureMessage, DuplicateSlugError } from "@/lib/data-service";
import { generateManagementToken, generateRandomSlug, checkRateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const rateLimit = checkRateLimit(`futureme-create:${ip}`, 10, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many FutureMe messages created. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const rawBody = await req.json();
    const parsed = createFutureMessageSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const unlockDate = new Date(parsed.data.unlockAt);
    if (isNaN(unlockDate.getTime()) || unlockDate.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Unlock date must be in the future." },
        { status: 400 }
      );
    }

    const manageToken = generateManagementToken();
    const slug = generateRandomSlug();

    const created = await createFutureMessage({
      slug,
      title: parsed.data.title,
      content: parsed.data.content,
      hint: parsed.data.hint,
      unlockAt: unlockDate,
      manageToken,
    });

    const origin = req.nextUrl.origin;
    const shareUrl = `${origin}/futureme/${created.slug}`;
    const manageUrl = `${origin}/manage/futureme/${manageToken}`;

    return NextResponse.json(
      {
        success: true,
        message: {
          slug: created.slug,
          title: created.title,
          unlockAt: created.unlockAt.toISOString(),
          hint: created.hint,
        },
        urls: {
          shareUrl,
          manageUrl,
        },
        manageToken,
        notice: "This message is locked until the specified date and time. Keep your link safe!",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof DuplicateSlugError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Error creating FutureMe message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

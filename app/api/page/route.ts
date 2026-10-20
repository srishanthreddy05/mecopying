import { NextRequest, NextResponse } from "next/server";
import { createStandalonePage } from "@/lib/data-service";
import { checkRateLimit } from "@/lib/security";
import { createPageSchema, EXPIRY_OPTIONS } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rateLimit = checkRateLimit(`create-page:${ip}`, 25, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many creation requests. Please slow down." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = createPageSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { title, slug, content, deletePassword, expiry } = parsed.data;

    const expiryOption = EXPIRY_OPTIONS.find((e) => e.value === expiry);
    const expiresInSeconds = expiryOption ? expiryOption.seconds : null;

    const page = await createStandalonePage({
      title,
      slug: slug || undefined,
      content,
      deletePassword,
      expiresInSeconds,
    });

    return NextResponse.json(
      {
        success: true,
        slug: page.slug,
        title: page.title,
        url: `/${page.slug}`,
        expiresAt: page.expiresAt,
        createdAt: page.createdAt,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create share page";
    const status = message.includes("already taken") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { isCollectionSlugAvailable, isSnippetSlugAvailable } from "@/lib/data-service";
import { checkRateLimit } from "@/lib/security";
import { RESERVED_SLUGS, SLUG_REGEX } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const rateLimit = checkRateLimit(`slug-check:${ip}`, 60, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many slug availability requests. Please slow down." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const slug = (searchParams.get("slug") || "").trim().toLowerCase();
  const collection = (searchParams.get("collection") || "").trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ available: false, error: "Slug is required" }, { status: 400 });
  }

  if (!SLUG_REGEX.test(slug)) {
    return NextResponse.json(
      { available: false, error: "Only lowercase letters, numbers, and hyphens are allowed" },
      { status: 400 }
    );
  }

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json(
      { available: false, error: "This slug is reserved for system use" },
      { status: 400 }
    );
  }

  try {
    if (type === "snippet") {
      if (!collection) {
        return NextResponse.json({ available: false, error: "Collection slug is required" }, { status: 400 });
      }
      const available = await isSnippetSlugAvailable(collection, slug);
      return NextResponse.json({ available, slug, collection });
    }

    const available = await isCollectionSlugAvailable(slug);
    return NextResponse.json({ available, slug });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error checking slug availability";
    return NextResponse.json({ available: false, error: message }, { status: 500 });
  }
}
